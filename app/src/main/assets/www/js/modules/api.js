/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.ApiFactory', [])

/*
 * Persist view url / code throughout app's life
 */

.factory('api', function() {
  return {
    previous_notification_board: [],
    active_notification_board: [],
    favorite_notification_boards: []
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.ApiServices', [])

/**
 * API services
 */

.service('ApiService', function($http, $q, DebugService, PROXIMITY_PLATFORM) {

  /*
   * Post url / code to Proximity Platform API and get related notification board information
   */

  this.handshake = function($scope, url, pass_on) {
    var self = this;
    if (typeof pass_on === 'undefined') pass_on = false;

    if (PROXIMITY_PLATFORM.enabled === true) {
      // In case no url is provided, use the one from the current scope
      if (typeof url === 'undefined') url = $scope.view.url;

      if (url == '') return;

      // Let's create a promise to return async response
      var deferred = $q.defer();

      DebugService.log($scope, 'Handshake: ' + url);

      DebugService.log($scope, 'Post ↓');
      DebugService.log($scope, {
        url: url,
        lat: $scope.geo.lat,
        lng: $scope.geo.lng,
        uuid: $scope.device.uuid,
        model: $scope.device.model,
        platform: $scope.device.platform
      });

      var request = $http({
          method: 'post',
          url: PROXIMITY_PLATFORM.api_endpoint + '/api/v1/remote/handshake',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: {
            url: url,
            lat: $scope.geo.lat,
            lng: $scope.geo.lng,
            uuid: $scope.device.uuid,
            model: $scope.device.model,
            platform: $scope.device.platform
          }
        })
        .success(function(data, status, headers, config) {

          DebugService.log($scope, 'Remote data loaded ↓');
          DebugService.log($scope, data);

          // Set beacons
          if (data.content.found) {
            DebugService.log($scope, 'Url / code recognized');
          }

          data.pass_on = pass_on;

          deferred.resolve(data);
        })
        .error(function(data, status) {
          // log error
          DebugService.log($scope, 'Post error api.js, use offline data');
          deferred.reject();
        });

      return deferred.promise;
    }
  };

  /*
   * Post scenario
   */

  this.scenario = function($scope, scenario_id, type_id, type, state, app_id, site_id) {
    var self = this;

    if (PROXIMITY_PLATFORM.enabled === true) {

      // Let's create a promise to return async response
      var deferred = $q.defer();

      DebugService.log($scope, 'Scenario id stat: ' + scenario_id);

      DebugService.log($scope, 'Post ↓');
      DebugService.log($scope, {
        scenario_id: scenario_id,
        type_id: type_id,
        type: type,
        state: state,
        app_id: app_id,
        site_id: site_id,
        lat: $scope.geo.lat,
        lng: $scope.geo.lng,
        uuid: $scope.device.uuid,
        model: $scope.device.model,
        platform: $scope.device.platform
      });

      var request = $http({
          method: 'post',
          url: PROXIMITY_PLATFORM.api_endpoint + '/api/v1/remote/scenario',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: {
            scenario_id: scenario_id,
            type_id: type_id,
            type: type,
            state: state,
            app_id: app_id,
            site_id: site_id,
            lat: $scope.geo.lat,
            lng: $scope.geo.lng,
            uuid: $scope.device.uuid,
            model: $scope.device.model,
            platform: $scope.device.platform
          }
        })
        .success(function(data, status, headers, config) {

          DebugService.log($scope, 'Interaction post success');

          deferred.resolve(data);
        })
        .error(function(data, status) {
          // log error
          DebugService.log($scope, 'Post error api.js interaction');
          deferred.reject();
        });

      return deferred.promise;
    }
  };
});