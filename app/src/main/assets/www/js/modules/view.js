/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.ViewFactory', [])

/*
 * Persist view url / code throughout app's life
 */

.factory('view', function() {
  return {
    title: '',
    input: '',
    code: '',
    icon: null,
    type: null,
    querystring: '',
    browser: '',
    url: ''
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.ViewServices', [])

/**
 * App view browser services
 */

.service('ViewService', function($location, $http, $q, $translate, $cordovaInAppBrowser, $cordovaNetwork, $ionicPopup, $ionicLoading, PROXIMITY_PLATFORM, ApiService, DebugService, BeaconService, GeofenceService, DataService, DeviceService) {

  /*
   * Set url in view and open view
   * ViewService.openView($scope, url);
   */

  this.openView = function($scope, url, parseBoard, setInput, background, locked, defer) {

    // Show debug
    if (url == 'debug on') {
      $scope.debug.nav = true;
      return;
    }

    if (typeof parseBoard === 'undefined') parseBoard = false; // If set to true, this will refresh beacons / geofences to new view + unsubscribe previous view
    if (typeof setInput === 'undefined') setInput = true; // If set to false, the address bar won't be updated
    if (typeof background === 'undefined') background = false; // If true, no view is shown
    if (typeof locked === 'undefined') locked = false; // If true, a fav can't be deleted
    if (typeof defer === 'undefined') defer = false; // Use promise

    if (!background) {
      if ($cordovaNetwork.isOffline()) {
        $ionicPopup.alert({
          title: $translate.instant('no_internet_connection')
        }).then(function(res) {});

        return;
      }
    }

    // Let's create a promise to return async response
    if (defer) {
      var deferred = $q.defer();
    }

    if (typeof url === 'undefined') {
      url = $scope.view.input;
    } else {
      if (setInput) $scope.view.input = url;
    }

    $scope.view.url = url;

    if (!background) $ionicLoading.show();

    if (url == 'about:blank' || url == '' || typeof url === 'undefined') {
      $ionicLoading.hide();
      return;
    }

    // Update Geo location
    DeviceService.updateGeolocation($scope);

    /*
     * ------------------------------------------------------------------------
     * Wait for geo location to be updated(or failing)
     */

    $scope.geoUpdated = function() {

      // Check for querystring to add additional information
      var hasQsChars = new RegExp("[?&]");

      if (hasQsChars.test(url)) {
        querystring = '&src=app&lat=' + $scope.geo.lat + '&lng=' + $scope.geo.lng;
      } else {
        querystring = '?src=app&lat=' + $scope.geo.lat + '&lng=' + $scope.geo.lng;
      }

      $scope.view.querystring = querystring;

      var isUrl = true;

      // Parse input, starts with http ?
      if (url.slice(0, 7) != "http://" && url.slice(0, 8) != "https://") {
        // Check for dot (.) to see if it's a code or url
        var hasDot = new RegExp("[.]");

        if (hasDot.test(url)) {
          url = 'http://' + url;
          $scope.view.browser = url + $scope.view.querystring;
          $scope.view.input = url;
          $scope.view.url = url;
        } else {
          // It's a code, not a url
          isUrl = false;
        }
      }

      var hideLoading = true;

      if (isUrl && !background) {
        hideLoading = false;
        inAppBrowser = $cordovaInAppBrowser.open(url + querystring, inAppBrowserTarget, inAppBrowserCfg)
          .then(function(event) {
            // success
          })
          .catch(function(event) {
            // error
            $cordovaInAppBrowser.close();
          });
      }

      // Get response from API call
      var promise = ApiService.handshake($scope, url);

      promise.then(function(data) {
        // Global name is always set
        $scope.view.title = data.content.name;

        // Data is found and the active notification board is updated
        if (data.content.found) {
          // The input was a code, not a url. Now we can set the corresponding url in the browser and address bar input
          if (!isUrl && !background) {
            hideLoading = false;
            $scope.view.browser = data.content.url + $scope.view.querystring;
            $scope.view.input = data.content.url;
            $scope.view.url = data.content.url;

            inAppBrowser = $cordovaInAppBrowser.open($scope.view.browser, inAppBrowserTarget, inAppBrowserCfg)
              .then(function(event) {
                // success
              })
              .catch(function(event) {
                // error
                $cordovaInAppBrowser.close();
              });
          }

          // Set globals
          $scope.view.icon = data.content.icon;
          $scope.view.type = data.content.type;

          // Bookmark
          DataService.addBookmark($scope, locked);

          $scope.api.previous_notification_board = $scope.api.active_notification_board;
          $scope.api.active_notification_board = data;

          if (parseBoard) {
            BeaconService.parseActiveBeacons($scope);
            GeofenceService.parseActiveGeofences($scope);
          }

          if (hideLoading && !background) {
            $ionicLoading.hide();
          }
        } else {
          if (!isUrl) {
            // Code not recognized
            $ionicPopup.alert({
              title: $translate.instant('code_not_recognized')
            }).then(function(res) {});
          }
          $scope.view.browser = url;
          if (!background) {
            $ionicLoading.hide();
          }
        }

        if (defer) {
          deferred.resolve(true);
        }
      }, function() {
        // Error
        $ionicPopup.alert({
          title: $translate.instant('connection_error')
        }).then(function(res) {});
        if (!background) {
          $ionicLoading.hide();
        }

        if (defer) {
          deferred.resolve(false);
        }
      });
    }

    if (defer) {
      return deferred.promise;
    }
  }
});