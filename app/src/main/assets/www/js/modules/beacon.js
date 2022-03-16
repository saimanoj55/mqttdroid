/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.BeaconFactory', [])

/*
 * Beacons
 */

.factory('beacon', function() {
  return {
    scenarios: []
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.BeaconServices', [])

/**
 * Monitor available beacons
 */

.service('BeaconService', function($rootScope, $cordovaBeacon, ScenarioService, DebugService) {

  this.states = {
    'ProximityUnknown': 0,
    'CLRegionStateInside': 1,
    'CLRegionStateOutside': 2,
    'ProximityFar': 3,
    'ProximityNear': 4,
    'ProximityImmediate': 5
  };

  /**
   * Unsubscribe all beacons
   */

  this.unsubscribeAll = function($scope) {
    DebugService.log($scope, 'Unsubscribe all beacons');

    document.addEventListener("deviceready", function() {

      // List boards
      var boards = $scope.api.favorite_notification_boards;

      if (boards.length > 0) {
        for (board_index = 0; board_index < boards.length; ++board_index) {
          if (typeof boards[board_index] !== 'undefined' && typeof boards[board_index].beacons !== 'undefined') {
            var beacons = boards[board_index].beacons;

            if (beacons.length > 0) {
              for (beacon_index = 0; beacon_index < beacons.length; ++beacon_index) {
                var beacon = $cordovaBeacon.createBeaconRegion(String(beacons[beacon_index].id), beacons[beacon_index].uuid, beacons[beacon_index].major, beacons[beacon_index].minor);
                $cordovaBeacon.stopMonitoringForRegion(beacon);
                $cordovaBeacon.stopRangingBeaconsInRegion(beacon);
              }
            }
          }
        }
      }

    }, false);
  }

  /**
   * Extract beacons from favorite var
   */

  this.extractFavBeacons = function($scope) {
    var self = this;
    document.addEventListener("deviceready", function() {

      // List boards
      var boards = $scope.api.favorite_notification_boards;

      if (boards.length > 0) {
        for (board_index = 0; board_index < boards.length; ++board_index) {
          if (typeof boards[board_index] !== 'undefined' && typeof boards[board_index].beacons !== 'undefined') {
            // Parse beacons
            self.parseBeacons($scope, boards[board_index]);
          }
        }
      }

    }, false);
  }

  /**
   * Subscribe beacons and extract relevant scenarios
   */

  this.parseBeacons = function($scope, board) {
    // Start watching beacons
    var beacons = board.beacons;

    if (beacons.length > 0) {
      for (beacon_index = 0; beacon_index < beacons.length; ++beacon_index) {
        var beacon = $cordovaBeacon.createBeaconRegion(String(beacons[beacon_index].id), beacons[beacon_index].uuid, beacons[beacon_index].major, beacons[beacon_index].minor);

        $cordovaBeacon.requestAlwaysAuthorization();
        $cordovaBeacon.startMonitoringForRegion(beacon);
        $cordovaBeacon.startRangingBeaconsInRegion(beacon);

        DebugService.log($scope, 'Subscribe beacon: ' + beacons[beacon_index].identifier + ' [' + beacons[beacon_index].id + ', ' + beacons[beacon_index].uuid + ']');

        // Extract relevant scenarios
        var scenarios = board.scenarios;

        if (scenarios.length > 0) {
          for (scenario_index = 0; scenario_index < scenarios.length; ++scenario_index) {
            var scenario = scenarios[scenario_index];

            if (scenario.beacons.length > 0) {
              for (scenario_beacons_index = 0; scenario_beacons_index < scenario.beacons.length; ++scenario_beacons_index) {
                var identifier = parseInt(scenario.beacons[scenario_beacons_index]);

                if (identifier == parseInt(beacons[beacon_index].id) && parseInt(scenario.scenario_then_id) > 0) {
                  $scope.beacon.scenarios.push({
                    identifier: scenario.beacons[scenario_beacons_index],
                    name: beacons[beacon_index].identifier,
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
   * Subscribe & unsubscribe beacons and extract relevant scenarios from active view
   * The active board is the last loaded site. This board is not (always) saved to the favorites.
   */

  this.parseActiveBeacons = function($scope) {
    if (typeof $scope.api.active_notification_board !== 'undefined' && typeof $scope.api.active_notification_board.beacons !== 'undefined') {
      DebugService.log($scope, 'Active notification board update [Beacons]');

      // Unsubscribe previous beacons
      if (typeof $scope.api.previous_notification_board !== 'undefined' && typeof $scope.api.previous_notification_board.beacons !== 'undefined') {
        var beacons = $scope.api.previous_notification_board.beacons;

        if (beacons.length > 0) {
          for (active_beacon_index = 0; active_beacon_index < beacons.length; ++active_beacon_index) {
            var beacon = $cordovaBeacon.createBeaconRegion(String(beacons[active_beacon_index].id), beacons[active_beacon_index].uuid, beacons[active_beacon_index].major, beacons[active_beacon_index].minor);

            $cordovaBeacon.stopMonitoringForRegion(beacon);
            $cordovaBeacon.stopRangingBeaconsInRegion(beacon);

            DebugService.log($scope, 'Unsubscribe beacon from active board: ' + beacons[active_beacon_index].identifier + ' [' + beacons[active_beacon_index].id + ', ' + beacons[active_beacon_index].uuid + ']');
          }
        }
      }

      // Parse beacons
      this.parseBeacons($scope, $scope.api.active_notification_board);
    }
  }

  /**
   * Monitor and range available beacons
   * These are beacons from favorites + currently active site
   */

  this.startTrackingBeacons = function($scope) {
    document.addEventListener("deviceready", function() {

      /**
       * ---------------------------------------------------------------------
       * Beacon events
       */

      DebugService.log($scope, 'Start tracking beacons');

      /**
       * This event is triggered when the script starts monitoring a beacon
       */

      $rootScope.$on("$cordovaBeacon:didStartMonitoringForRegion", function(event, pluginResult) {
        // We've started monitoring this beacon: pluginResult.region.identifier
        // DebugService.log($scope, pluginResult);
      });

      /**
       * Monitor region enter (state.CLRegionStateInside) or leave (state.CLRegionStateOutside)
       */

      $rootScope.$on("$cordovaBeacon:didDetermineStateForRegion", function(event, pluginResult) {

        // DebugService.log($scope, pluginResult);

        if (typeof pluginResult.region.identifier !== 'undefined') {
          // Get beacon info
          var identifier = pluginResult.region.identifier; // This is the numeric id
          var uuid = pluginResult.region.uuid;
          var major = pluginResult.region.major;
          var minor = pluginResult.region.minor;
          var state = pluginResult.state;

          // Check if state has changed for queued scenarios
          ScenarioService.beaconEventUpdate($scope, identifier, state);

          //DebugService.log($scope, 'The state of beacon #' + identifier + ' is ' + state);

          // Check if there're scenarios associated with this state
          if ($scope.beacon.scenarios.length > 0) {
            for (beacon_scenario_index = 0; beacon_scenario_index < $scope.beacon.scenarios.length; ++beacon_scenario_index) {
              var scenario = $scope.beacon.scenarios[beacon_scenario_index].scenario;
              var scenario_beacon_id = $scope.beacon.scenarios[beacon_scenario_index].identifier;

              /**
               * User enters beacon region
               */

              if (
                parseInt(scenario_beacon_id) == parseInt(identifier) &&
                parseInt(scenario.scenario_if_id) == 1 &&
                state == 'CLRegionStateInside'
              ) {
                // DebugService.log($scope, 'Region enter detected for this beacon');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.beacon.scenarios[beacon_scenario_index]);

                if (valid) {
                  ScenarioService.triggerBeaconScenario($scope, $scope.beacon.scenarios[beacon_scenario_index]);
                }
              }

              /**
               * User leaves beacon region
               */

              if (
                parseInt(scenario_beacon_id) == parseInt(identifier) &&
                parseInt(scenario.scenario_if_id) == 2 &&
                state == 'CLRegionStateOutside'
              ) {
                // DebugService.log($scope, 'Region leave detected for this beacon');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.beacon.scenarios[beacon_scenario_index]);

                if (valid) {
                  ScenarioService.triggerBeaconScenario($scope, $scope.beacon.scenarios[beacon_scenario_index]);
                }
              }
            }
          }
        }
      });

      /**
       * Proximity ranging of beacons
       */

      $rootScope.$on("$cordovaBeacon:didRangeBeaconsInRegion", function(event, pluginResult) {

        // DebugService.log($scope, pluginResult);

        if (pluginResult.beacons.length > 0) {
          // Get beacon info
          var identifier = pluginResult.region.identifier; // This is the numeric id
          var uuid = pluginResult.beacons[0].uuid;
          var major = pluginResult.beacons[0].major;
          var minor = pluginResult.beacons[0].minor;
          var proximity = pluginResult.beacons[0].proximity;
          var accuracy = pluginResult.beacons[0].accuracy;
          var rssi = pluginResult.beacons[0].rssi;
          var tx = pluginResult.beacons[0].tx;

          if (proximity == 0) return; // Unknown proximity

          // Check if state has changed for queued scenarios
          ScenarioService.beaconEventUpdate($scope, identifier, proximity);

          // Calculate distance - experimental, is beacon specific
          if (rssi == 0) {
            var distance = -1.0; // if we cannot determine distance, return -1.
          }

          var ratio = rssi * 1.0 / tx;
          if (ratio < 1.0) {
            var distance = Math.pow(ratio, 10);
          } else {
            var accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
            var distance = accuracy;
          }

          // DebugService.log($scope, 'The proximity of beacon #' + identifier + ' is ' + proximity + ', approximate distance is ' + distance);

          // Check if there're scenarios associated with this proximity
          if ($scope.beacon.scenarios.length > 0) {
            for (beacon_scenario_index = 0; beacon_scenario_index < $scope.beacon.scenarios.length; ++beacon_scenario_index) {
              var scenario = $scope.beacon.scenarios[beacon_scenario_index].scenario;
              var scenario_beacon_id = $scope.beacon.scenarios[beacon_scenario_index].identifier;

              /**
               * is_far_from
               */

              if (
                parseInt(scenario_beacon_id) == parseInt(identifier) &&
                parseInt(scenario.scenario_if_id) == 3 &&
                proximity == 'ProximityFar'
              ) {
                // DebugService.log($scope, 'ProximityFar trigger for this beacon');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.beacon.scenarios[beacon_scenario_index]);

                if (valid) {
                  ScenarioService.triggerBeaconScenario($scope, $scope.beacon.scenarios[beacon_scenario_index]);
                }
              }

              /**
               * is_near
               */

              if (
                parseInt(scenario_beacon_id) == parseInt(identifier) &&
                parseInt(scenario.scenario_if_id) == 4 &&
                proximity == 'ProximityNear'
              ) {
                // DebugService.log($scope, 'ProximityNear trigger for this beacon');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.beacon.scenarios[beacon_scenario_index]);

                if (valid) {
                  ScenarioService.triggerBeaconScenario($scope, $scope.beacon.scenarios[beacon_scenario_index]);
                }
              }

              /**
               * is_very_near
               */

              if (
                parseInt(scenario_beacon_id) == parseInt(identifier) &&
                parseInt(scenario.scenario_if_id) == 5 &&
                proximity == 'ProximityImmediate'
              ) {
                // DebugService.log($scope, 'ProximityImmediate trigger for this beacon');

                // Validate day + time conditions
                var valid = ScenarioService.validateDateTimeConditions($scope.beacon.scenarios[beacon_scenario_index]);

                if (valid) {
                  ScenarioService.triggerBeaconScenario($scope, $scope.beacon.scenarios[beacon_scenario_index]);
                }
              }
            }
          }
        }
      });

    }, false);
  }
});