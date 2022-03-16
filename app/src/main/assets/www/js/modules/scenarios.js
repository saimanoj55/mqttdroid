/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.ScenarioFactory', [])

.factory('scenario', function($translate) {
  return {
    content_title: '',
    content_state: 'none',
    selectedIndex: -1,
    beacon_queue: [],
    geofence_queue: [],
    history: [],
    history_url: 'about:blank',
    active: {
      'scenario_then_id': 0
    }
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.ScenarioServices', [])

/**
 * Scenario 
 */

.service('ScenarioService', function($cordovaNetwork, DebugService, ApiService, $cordovaLocalNotification, $location, $cordovaInAppBrowser, $ionicLoading) {

  this.states = {
    'ProximityUnknown': 0,
    'CLRegionStateInside': 1,
    'CLRegionStateOutside': 2,
    'ProximityFar': 3,
    'ProximityNear': 4,
    'ProximityImmediate': 5
  };

  /**
   * Scenario response based on board
   */

  this.response = function($scope, place_scenario, type) {

    /**
     * Set active scenario for content view
     * and open content view
     */

    $scope.scenario.active = place_scenario.scenario;
    $scope.scenario.content_title = '';

    var icon = '',
      state = '',
      ngClick = '',
      title = '',
      open_url = '';

    /**
     * show_image
     */

    if (place_scenario.scenario.scenario_then_id == 2) {
      icon = 'ion-image';
      open_url = place_scenario.scenario.show_image;
      ngClick = "openContent($index, '" + open_url + "')";

      DebugService.log($scope, 'show_image: ' + open_url);
    }

    /**
     * show_template
     */

    if (place_scenario.scenario.scenario_then_id == 3) {
      icon = 'ion-document';
      open_url = place_scenario.scenario.template;
      ngClick = "openContent($index, '" + open_url + "')";

      DebugService.log($scope, 'show_template: ' + open_url);
    }

    /**
     * open_url
     */

    if (place_scenario.scenario.scenario_then_id == 4) {
      icon = 'ion-link';
      open_url = place_scenario.scenario.open_url;
      ngClick = "openContent($index, '" + open_url + "')";

      DebugService.log($scope, 'open_url: ' + open_url);
    }

    /**
     * Add scenario to history
     */

    switch (place_scenario.scenario.scenario_if_id) {
      case 1:
        title = place_scenario.name;
        state = 'enter';
        break;
      case 2:
        title = place_scenario.name;
        state = 'leave';
        break;
      case 3:
        title = place_scenario.name;
        state = 'far';
        break;
      case 4:
        title = place_scenario.name;
        state = 'near';
        break;
      case 5:
        title = place_scenario.name;
        state = 'immediate';
        break;
    }

    if (icon != '' && state != '' && open_url != '' && title != '' && $cordovaNetwork.isOnline()) {
      /*
            $location.path('/nav/beacons');
      */

      if (inAppBrowser !== null) {
        $cordovaInAppBrowser.executeScript({
          code: "document.location = '" + open_url + "';"
        }, function() {
          // redirected
        });
      } else {
        $ionicLoading.show();

        inAppBrowser = $cordovaInAppBrowser.open(open_url, '_blank', inAppBrowserCfg)
          .then(function(event) {
            // success
          })
          .catch(function(event) {
            // error
          });
      }

      $scope.safeApply(function() {
        setTimeout(function() {
          $scope.scenario.content_title = title;
          $scope.scenario.content_state = state;
          $scope.scenario.selectedIndex = $scope.scenario.history.length;

          $scope.scenario.history.push({
            title: title,
            ngClick: ngClick,
            icon: icon,
            state: state
          });
        }, 800);


        /**
         * Post interaction stat Proximity Platform
         */

        var promise = ApiService.scenario($scope, place_scenario.scenario.id, place_scenario.identifier, type, state, place_scenario.scenario.app_id, place_scenario.scenario.site_id);

        promise.then(
          function(data) { // Request succeeded
            DebugService.log($scope, 'Scenario stat success');
          },
          function(response) { // Request failed
            DebugService.log($scope, 'Scenario stat failure');
          }
        );

      });
    }
  }

  /**
   * For every beacon event, the scenario queue is checked for changes from last proximity / region state
   */

  this.beaconEventUpdate = function($scope, beacon_id, state) {
    var state = parseInt(this.states[state]);

    for (key in $scope.scenario.beacon_queue) {
      var board = $scope.scenario.beacon_queue[key];
      var scenario_if_id = parseInt(board.scenario.scenario_if_id);
      var scenario_beacon_id = parseInt(board.beacon_id);

      // Update last state for either region or proximity
      if (parseInt(this.states[state]) <= 2) {
        $scope.scenario.beacon_queue[key].last_region = state;
      } else {
        $scope.scenario.beacon_queue[key].last_proximity = state;
      }

      if ((scenario_if_id > 2 && state > 2) || (scenario_if_id <= 2 && state <= 2)) {
        // Check if state has changed for either region or proxitmiy
        if (parseInt(beacon_id) == scenario_beacon_id && scenario_if_id != state) {
          $scope.scenario.beacon_queue[key].state_has_changed = true;
        }
      }
    }
  }

  /**
   * Check whether to trigger scenario
   */

  this.triggerBeaconScenario = function($scope, beacon_scenario) {
    var self = this;

    /**
     * Update scenario queue, for each beacon
     */

    var trigger_scenario = false;
    var triggered = 1;

    var scenario_id = beacon_scenario.scenario.id;
    var beacon_id = parseInt(beacon_scenario.identifier);
    var beacon_queue_key = scenario_id + '.' + beacon_id;

    /**
     * Check if scenario is in queue and if it can be triggered (again)
     */

    var trigger_scenario_beacon = false;

    if (typeof $scope.scenario.beacon_queue[beacon_queue_key] !== 'undefined') {
      // Check cooldown period
      var last_trigger = parseInt($scope.scenario.beacon_queue[beacon_queue_key].date);
      var seconds_ago = (parseInt(Date.now()) - last_trigger) / 1000;

      triggered = parseInt($scope.scenario.beacon_queue[beacon_queue_key].triggered) + 1;

      // This scenario has been triggered before, check whether it can be triggered again
      if ($scope.scenario.beacon_queue[beacon_queue_key].state_has_changed) {
        DebugService.log($scope, 'Beacon state has changed, check if scenario can be triggered again');

        if (seconds_ago < 5) {
          console.log('Within cooldown period (' + seconds_ago + ' sec ago), cancel trigger');
        } else {
          trigger_scenario_beacon = true;
        }
      }
    } else {
      DebugService.log($scope, 'First time for this scenario');
      trigger_scenario_beacon = true;
    }

    if (trigger_scenario_beacon) {
      if (typeof beacon_scenarios[scenario_id] !== 'undefined') {
        var beacon_scenarios_last_trigger = beacon_scenarios[scenario_id];
        var beacon_scenarios_seconds_ago = (parseInt(Date.now()) - beacon_scenarios_last_trigger) / 1000;
        var beacon_scenarios_frequency = parseInt(beacon_scenario.scenario.frequency);

        if (beacon_scenarios_seconds_ago < beacon_scenarios_frequency) trigger_scenario_beacon = false;

        if (!trigger_scenario_beacon) console.log('beacon_scenarios_seconds_ago < beacon_scenarios_frequency');
      }
    }

    if (trigger_scenario_beacon) {
      var trigger_scenario = true;

      if (beacon_scenario.scenario.scenario_if_id <= 2) {
        var last_region = beacon_scenario.scenario.scenario_if_id;
        var last_proximity = null;
      } else {
        var last_region = null;
        var last_proximity = beacon_scenario.scenario.scenario_if_id;
      }

      $scope.scenario.beacon_queue[beacon_queue_key] = {
        scenario_id: scenario_id,
        beacon_id: beacon_id,
        scenario: beacon_scenario.scenario,
        state_has_changed: false,
        last_region: last_region,
        last_proximity: last_proximity,
        date: Date.now(),
        triggered: triggered
      };
    }

    if (trigger_scenario) {
      // Save last scenario trigger time for frequency check
      beacon_scenarios[scenario_id] = Date.now();

      var now = new Date().getTime();
      var delay = new Date(now + beacon_scenario.scenario.delay * 1000);

      if (beacon_scenario.scenario.scenario_if_id <= 2) {
        DebugService.log($scope, 'Region update');
        DebugService.log($scope, 'app_status: ' + app_status);

        // Check if notification is necessary
        if (app_status == 'ready') {
          self.response($scope, beacon_scenario, 'beacon');
        } else {
          // Send notification
          document.addEventListener("deviceready", function() {

            var notification_text = beacon_scenario.scenario.notification;
            //if (ionic.Platform.isIOS()) notification_text = notification_text.replace(/%/g, '%%');
            if (ionic.Platform.isAndroid()) notification_text = notification_text.replace(/%%/g, '%');

            $cordovaLocalNotification.schedule({
              id: beacon_scenario.scenario.id,
              text: notification_text,
              at: delay
            }).then(function(result) {});

          }, false);

          self.response($scope, beacon_scenario, 'beacon');
        }
      } else {
        DebugService.log($scope, 'Proximity update');
        this.response($scope, beacon_scenario, 'beacon');
      }
    }
  }

  /**
   * For every geofence event, the scenario queue is checked for changes in last region state
   */

  this.geofenceEventUpdate = function($scope, geofence_id, state) {
    var state = parseInt(state);

    for (key in $scope.scenario.geofence_queue) {
      var board = $scope.scenario.geofence_queue[key];
      var scenario_if_id = parseInt(board.scenario.scenario_if_id);
      var scenario_geofence_id = parseInt(board.geofence_id);

      $scope.scenario.geofence_queue[key].last_state = state;

      if (scenario_if_id > 2) {
        // Check if state has changed for either region or proxitmiy
        if (parseInt(geofence_id) == scenario_geofence_id && scenario_if_id != state) {
          $scope.scenario.geofence_queue[key].state_has_changed = true;
        }
      }
    }
  }

  /**
   * Check whether to trigger geofence
   */

  this.triggerGeofenceScenario = function($scope, geofence_scenario) {
    var self = this;

    /**
     * Update scenario queue, for each beacon
     */

    var trigger_scenario = false;

    var scenario_id = geofence_scenario.scenario.id;
    var geofence_id = parseInt(geofence_scenario.identifier);
    var geofence_queue_key = scenario_id + '.' + geofence_id;

    /**
     * Check if scenario is in queue and if it can be triggered (again)
     */

    var trigger_scenario_geofence = false;

    if (typeof $scope.scenario.geofence_queue[geofence_queue_key] !== 'undefined') {
      // This scenario has been triggered before, check whether it can be triggered again
      if ($scope.scenario.geofence_queue[geofence_queue_key].state_has_changed) {
        DebugService.log($scope, 'Geofence state has changed, scenario can be triggered again');
        trigger_scenario_geofence = true;
      }
    } else {
      DebugService.log($scope, 'First time for this scenario');
      trigger_scenario_geofence = true;
    }

    if (trigger_scenario_geofence) {
      if (typeof geofence_scenarios[scenario_id] !== 'undefined') {
        var geofence_scenarios_last_trigger = geofence_scenarios[scenario_id];
        var geofence_scenarios_seconds_ago = (parseInt(Date.now()) - geofence_scenarios_last_trigger) / 1000;
        var geofence_scenarios_frequency = parseInt(geofence_scenario.scenario.frequency);

        if (geofence_scenarios_seconds_ago < geofence_scenarios_frequency) trigger_scenario_geofence = false;

        if (!trigger_scenario_geofence) console.log('geofence_scenarios_seconds_ago < geofence_scenarios_frequency');
      }
    }

    if (trigger_scenario_geofence) {
      var trigger_scenario = true;

      $scope.scenario.geofence_queue[geofence_queue_key] = {
        scenario_id: scenario_id,
        geofence_id: geofence_id,
        scenario: geofence_scenario.scenario,
        state_has_changed: false,
        last_state: geofence_scenario.scenario.scenario_if_id,
        date: Date.now()
      };
    }

    if (trigger_scenario) {
      // Save last scenario trigger time for frequency check
      geofence_scenarios[scenario_id] = Date.now();

      var now = new Date().getTime();
      var delay = new Date(now + geofence_scenario.scenario.delay * 1000);

      if (geofence_scenario.scenario.scenario_if_id <= 2) {
        DebugService.log($scope, 'Geofence update');
        DebugService.log($scope, 'app_status: ' + app_status);

        // Check if notification is necessary
        if (app_status == 'ready') {
          self.response($scope, geofence_scenario, 'geofence');
        } else {
          // Send notification
          document.addEventListener("deviceready", function() {

            var notification_text = geofence_scenario.scenario.notification;
            //if (ionic.Platform.isIOS()) notification_text = notification_text.replace(/%/g, '%%');
            if (ionic.Platform.isAndroid()) notification_text = notification_text.replace(/%%/g, '%');

            $cordovaLocalNotification.schedule({
              id: geofence_scenario.scenario.id,
              text: notification_text,
              at: delay
            }).then(function(result) {
              self.response($scope, geofence_scenario, 'geofence');
            });

          }, false);
        }
      }
    }
  }

  /**
   * Validate date & time conditions based on board and timezone
   */

  this.validateDateTimeConditions = function(board) {
    var scenario = board.scenario;
    var timezone = board.timezone;

    // Check for day
    var valid_day = false;
    var current_day_of_week = moment().tz(timezone).day();

    if (scenario.scenario_day_id == 1) valid_day = true; // every_day
    if (scenario.scenario_day_id == 3 && (current_day_of_week == 6 || current_day_of_week == 7)) valid_day = true; // saturday_and_sunday
    if (scenario.scenario_day_id == 4 && (current_day_of_week == 5 || current_day_of_week == 6)) valid_day = true; // friday_and_saturday
    if (scenario.scenario_day_id == 5 && (current_day_of_week >= 1 && current_day_of_week <= 5)) valid_day = true; // monday_to_friday
    if (scenario.scenario_day_id == 6 && ((current_day_of_week >= 1 && current_day_of_week <= 4) || current_day_of_week == 7)) valid_day = true; // sunday_to_thursday
    if (scenario.scenario_day_id == 7 && current_day_of_week == 1) valid_day = true; // monday
    if (scenario.scenario_day_id == 8 && current_day_of_week == 2) valid_day = true; // tuesday
    if (scenario.scenario_day_id == 9 && current_day_of_week == 3) valid_day = true; // wednesday
    if (scenario.scenario_day_id == 10 && current_day_of_week == 4) valid_day = true; // thursday
    if (scenario.scenario_day_id == 11 && current_day_of_week == 5) valid_day = true; // friday
    if (scenario.scenario_day_id == 12 && current_day_of_week == 6) valid_day = true; // saturday
    if (scenario.scenario_day_id == 13 && current_day_of_week == 7) valid_day = true; // sunday

    // Between two dates
    if (scenario.scenario_day_id == 2) {
      var current_date = moment(moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss'));
      var date_start = moment(scenario.date_start).startOf('day');
      var date_end = moment(scenario.date_end).endOf('day');

      if (current_date.isBefore(date_end) && date_start.isBefore(current_date)) valid_day = true; // between_two_dates 
    }

    // Check for time
    var valid_time = false;

    if (scenario.scenario_time_id == 1) valid_time = true; // all_the_time

    // Between two times
    if (scenario.scenario_time_id == 2) {
      var current_date = moment(moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss'));
      var time_start = moment(scenario.time_start, 'HH:mm:ss');
      var time_end = moment(scenario.time_end, 'HH:mm:ss');

      if (current_date.isBefore(time_end) && time_start.isBefore(current_date)) valid_time = true; // between_two_times 
    }

    return (valid_day && valid_time) ? true : false;
  }
});