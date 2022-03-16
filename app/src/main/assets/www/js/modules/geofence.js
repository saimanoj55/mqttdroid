/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.GeofenceFactory', [])

/*
 * Geofences
 */

.factory('geofence', function() {
  return {
    scenarios: []
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.GeofenceServices', [])

/**
 * Monitor available geofences
 */

.service('GeofenceService', function($rootScope, ScenarioService, DebugService) {

  /**
   * Unsubscribe all beacons
   */

  this.unsubscribeAll = function($scope) {
    DebugService.log($scope, 'Unsubscribe all geofences');

    document.addEventListener("deviceready", function() {

      window.geofence.removeAll()
        .then(function() {
            //DebugService.log($scope, 'All geofences successfully removed');
          },
          function(reason) {
            DebugService.log($scope, 'Removing geofences failed, ' + reason);
          });

    }, false);
  }

  /**
   * Extract geofences from favorite var
   */

  this.extractFavGeofences = function($scope) {
    var self = this;
    document.addEventListener("deviceready", function() {

      // List boards
      var boards = $scope.api.favorite_notification_boards;

      if (boards.length > 0) {
        for (board_index = 0; board_index < boards.length; ++board_index) {
          if (typeof boards[board_index] !== 'undefined' && typeof boards[board_index].geofences !== 'undefined') {
            // Parse geofences
            self.parseGeofences($scope, boards[board_index]);
          }
        }
      }

    }, false);
  }

  /**
   * Subscribe geofences and extract relevant scenarios
   */

  this.parseGeofences = function($scope, board) {
    // Start watching geofences
    var geofences = board.geofences;

    if (geofences.length > 0) {
      for (geofence_index = 0; geofence_index < geofences.length; ++geofence_index) {
        window.geofence.addOrUpdate({
          id: String(geofences[geofence_index].id), //A unique identifier of geofence
          latitude: parseFloat(geofences[geofence_index].lat), //Geo latitude of geofence
          longitude: parseFloat(geofences[geofence_index].lng), //Geo longitude of geofence
          radius: parseInt(geofences[geofence_index].radius), //Radius of geofence in meters
          transitionType: 3
            /*, //Type of transition 1 - Enter, 2 - Exit, 3 - Both
                     notification: {     //Notification object
                       id: parseInt(geofences[geofence_index].id), //optional should be integer, id of notification
                       title: '', //Title of notification
                       text: '', //Text of notification
                       openAppOnClick: true,//is main app activity should be opened after clicking on notification
                     }*/
        }).then(function(result) {

          console.log('Geofence added');

        }, function(reason) {

          console.log('Failed to add region', reason);

        });

        DebugService.log($scope, 'Subscribe geofence: ' + geofences[geofence_index].identifier + ' [' + geofences[geofence_index].id + ', ' + geofences[geofence_index].lat + ', ' + geofences[geofence_index].lng + ', ' + geofences[geofence_index].radius + ']');

        // Extract relevant scenarios
        var scenarios = board.scenarios;

        if (scenarios.length > 0) {
          for (scenario_index = 0; scenario_index < scenarios.length; ++scenario_index) {
            var scenario = scenarios[scenario_index];

            if (scenario.geofences.length > 0) {
              for (scenario_geofence_index = 0; scenario_geofence_index < scenario.geofences.length; ++scenario_geofence_index) {
                var identifier = parseInt(scenario.geofences[scenario_geofence_index]);

                if (identifier == parseInt(geofences[geofence_index].id) && parseInt(scenario.scenario_then_id) > 0) {
                  $scope.geofence.scenarios.push({
                    identifier: scenario.geofences[scenario_geofence_index],
                    name: geofences[geofence_index].identifier,
                    timezone: board.board.timezone,
                    scenario: scenario
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Subscribe & unsubscribe geofences and extract relevant scenarios from active view
   * The active board is the last loaded site. This board is not (always) saved to the favorites.
   */

  this.parseActiveGeofences = function($scope) {
    if (typeof $scope.api.active_notification_board !== 'undefined' && typeof $scope.api.active_notification_board.geofences !== 'undefined') {
      DebugService.log($scope, 'Active notification board update [Geofences]');

      // Unsubscribe previous geofences
      if (typeof $scope.api.previous_notification_board !== 'undefined' && typeof $scope.api.previous_notification_board.geofences !== 'undefined') {
        var geofences = $scope.api.previous_notification_board.geofences;

        if (geofences.length > 0) {
          for (geofence_index = 0; geofence_index < geofences.length; ++geofence_index) {
            window.geofence.remove(String(geofences[geofence_index].id))
              .then(function() {
                  DebugService.log($scope, 'Unsubscribe geofence from active board: ' + geofences[geofence_index].identifier + ' [' + geofences[geofence_index].id + ', ' + geofences[geofence_index].lat + ', ' + geofences[geofence_index].lng + ', ' + geofences[geofence_index].radius + ']');
                },
                function(reason) {
                  DebugService.log($scope, 'Failed to stop monitoring region');
                  DebugService.log($scope, reason);
                });
          }
        }
      }

      // Parse geofences
      this.parseGeofences($scope, $scope.api.active_notification_board);
    }
  }

  /**
   * Monitor and range available geofences
   * These are geofences from favorites + currently active site
   */

  this.startTrackingGeofences = function($scope) {
    document.addEventListener("deviceready", function() {

      /**
       * ---------------------------------------------------------------------
       * Geofence events
       */

      DebugService.log($scope, 'Start tracking geofences');

      //window.geofence.initialize(); // <---- fails on iOS: Could not cast value of type 'CLBeaconRegion' to 'CLCircularRegion'

      /**
       * ---------------------------------------------------------------------
       * Listen for geofence transitions
       * 
       * geo.transitionType:
       * 1 = enter region
       * 2 = exit region
       *
       */

      window.geofence.onTransitionReceived = function(geofences) {

        geofences.forEach(function(geo) {
          DebugService.log($scope, 'Geofence transition detected');
          DebugService.log($scope, geo);

          var identifier = parseInt(geo.id);
          var state = parseInt(geo.transitionType);

          // Check if state has changed for queued scenarios
          ScenarioService.geofenceEventUpdate($scope, identifier, state);

          // Check if there're scenarios associated with this state
          if ($scope.geofence.scenarios.length > 0) {
            for (geofence_scenario_index = 0; geofence_scenario_index < $scope.geofence.scenarios.length; ++geofence_scenario_index) {
              var scenario = $scope.geofence.scenarios[geofence_scenario_index].scenario;
              var scenario_geofence_id = $scope.geofence.scenarios[geofence_scenario_index].identifier;

              /**
               * User enters geofence region
               */

              if (
                parseInt(scenario_geofence_id) == identifier &&
                parseInt(scenario.scenario_if_id) == 1 &&
                state == 1
              ) {
                // DebugService.log($scope, 'Region enter detected for this geofence');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.geofence.scenarios[geofence_scenario_index]);

                if (valid) {
                  ScenarioService.triggerGeofenceScenario($scope, $scope.geofence.scenarios[geofence_scenario_index]);
                }
              }

              /**
               * User leaves geofence region
               */

              if (
                parseInt(scenario_geofence_id) == identifier &&
                parseInt(scenario.scenario_if_id) == 2 &&
                state == 2
              ) {
                // DebugService.log($scope, 'Region leave detected for this geofence');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.geofence.scenarios[geofence_scenario_index]);

                if (valid) {
                  ScenarioService.triggerGeofenceScenario($scope, $scope.geofence.scenarios[geofence_scenario_index]);
                }
              }
            }
          }
        });

      };

    }, false);
  }
});