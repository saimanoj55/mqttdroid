/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.DeviceFactory', [])

/*
 * Persist device geo location throughout app's life
 */

.factory('geo', function() {
  return {
    lat: null,
    lng: null,
    alt: null,
    accuracy: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null
  };
})

/*
 * Persist device info throughout app's life
 */

.factory('device', function() {
  return {
    cordova: null,
    model: null,
    platform: null,
    uuid: null,
    version: null
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.DeviceServices', [])

/**
 * General device information
 */

.service('DeviceService', function($cordovaDevice, $cordovaGeolocation, DebugService, geo, device) {

  /**
   * Set device information
   */

  this.loadDevice = function($scope) {

    document.addEventListener("deviceready", function() {

      /*
       * Get device information
       */

      device.cordova = $cordovaDevice.getCordova();
      device.model = $cordovaDevice.getModel();
      device.platform = $cordovaDevice.getPlatform();
      device.uuid = $cordovaDevice.getUUID();
      device.version = $cordovaDevice.getVersion();

      $scope.device = device;

      /*
       * Get Geo Location
       */

      $cordovaGeolocation
        .getCurrentPosition({
          timeout: 1000 * 10,
          maximumAge: 1000 * 10,
          enableHighAccuracy: true
        })
        .then(function(position) {
          geo.lat = position.coords.latitude;
          geo.lng = position.coords.longitude;
          geo.alt = position.coords.altitude;
          geo.accuracy = position.coords.accuracy;
          geo.altitudeAccuracy = position.coords.altitudeAccuracy;
          geo.heading = position.coords.heading;
          geo.speed = position.coords.speed;
          geo.timestamp = position.coords.timestamp;

          $scope.geo = geo;

          $scope.geoLoaded();
        }, function(err) {
          // error
          DebugService.log($scope, err);

          $scope.geoLoaded();
        });
    }, false);
  }

  /**
   * Update Geo Location
   */

  this.updateGeolocation = function($scope) {

    document.addEventListener("deviceready", function() {

      /*
       * Get Geo Location
       */

      $cordovaGeolocation
        .getCurrentPosition({
          timeout: 1000 * 10,
          maximumAge: 1000 * 10,
          enableHighAccuracy: true
        })
        .then(function(position) {
          geo.lat = position.coords.latitude;
          geo.lng = position.coords.longitude;
          geo.alt = position.coords.altitude;
          geo.accuracy = position.coords.accuracy;
          geo.altitudeAccuracy = position.coords.altitudeAccuracy;
          geo.heading = position.coords.heading;
          geo.speed = position.coords.speed;
          geo.timestamp = position.coords.timestamp;

          $scope.geo = geo;

          $scope.geoUpdated();
        }, function(err) {
          // error
          DebugService.log($scope, err);

          $scope.geoUpdated();
        });
    }, false);
  }
});