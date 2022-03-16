angular.module('ngApp.controllers', ['ngApp.config'])

/*
 * ---------------------------------------------------
 * Nav controller
 * ---------------------------------------------------
 */

.controller('NavCtrl', function($scope, $rootScope, $ionicSideMenuDelegate, $location) {

  $rootScope.location = $location;

  $scope.showLeftMenu = function() {
    $ionicSideMenuDelegate.toggleLeft();
  };

  $scope.showRightMenu = function() {
    $ionicSideMenuDelegate.toggleRight();
  };
})

/*
 * ---------------------------------------------------
 * Main App controller
 * ---------------------------------------------------
 */

.controller('AppCtrl', function(
  $scope,
  $rootScope,
  $localStorage,
  $window,
  $translate,
  $ionicLoading,
  $ionicPopup,
  $http,
  $cordovaSQLite,
  $cordovaBeacon,
  $cordovaSplashscreen,
  $cordovaBarcodeScanner,
  $cordovaInAppBrowser,
  DeviceService,
  DataService,
  ViewService,
  BeaconService,
  GeofenceService,
  EddystoneService,
  api,
  view,
  favs,
  device,
  geo,
  beacon,
  geofence,
  eddystone,
  scenario,
  debug,
  PROXIMITY_PLATFORM,
  APPS
) {

  /*
   * Globals
   */

  $scope.$storage = $localStorage;
  $scope.favs = favs;
  $scope.view = view;
  $scope.device = device;
  $scope.geo = geo;
  $scope.api = api;
  $scope.beacon = beacon;
  $scope.geofence = geofence;
  $scope.eddystone = eddystone;
  $scope.scenario = scenario;
  $scope.debug = debug;

  /*
   * ------------------------------------------------------------------------
   * Open database
   */

  document.addEventListener("deviceready", function() {

    db = $cordovaSQLite.openDB({
      name: PROXIMITY_PLATFORM.sqlite.db_name,
      location: PROXIMITY_PLATFORM.sqlite.location,
      androidDatabaseImplementation: PROXIMITY_PLATFORM.sqlite.androidDatabaseImplementation,
      androidLockWorkaround: PROXIMITY_PLATFORM.sqlite.androidLockWorkaround
    });

    db.transaction(function(tx) {

      // Reset db and localStorage for testing purposes
      devReset = false;

      if (devReset) {
        tx.executeSql('DROP TABLE IF EXISTS settings');
        tx.executeSql('DROP TABLE IF EXISTS favs');

        delete $scope.$storage.app_language;
        delete $scope.$storage.apps_default_loaded;
      }

      /**
       * Create table if not exists
       */

      tx.executeSql('CREATE TABLE IF NOT EXISTS favs (id integer primary key, name text, icon text, url text, api text, created integer)');

      db.transaction(function(tx) {

        /**
         * Updates for `favs` table 
         */

        tx.executeSql("PRAGMA table_info(favs);", [], function(tx, result) {
          var table = [];

          for (var i = 0; i < result.rows.length; i++) {
            table.push(result.rows.item(i).name);
          }

          // Check if `locked` column exists
          if (table.indexOf('locked') === -1) {
            tx.executeSql('ALTER TABLE favs ADD COLUMN locked integer;');
          }
        });

        /*
         * ------------------------------------------------------------------------
         * Load device information (uuid, geo)
         */

        DeviceService.loadDevice($scope);

        /*
         * ------------------------------------------------------------------------
         * Wait for device geo location to be loaded (or failing)
         */

        $scope.geoLoaded = function() {

          /*
           * ------------------------------------------------------------------------
           * Load favorites
           */

          DataService.loadFavs($scope);
        }
      });
    });

    // Check if Bluetooth is enabled (Andoird only, iOS seems to be buggy)
    if (ionic.Platform.isAndroid()) {
      $cordovaBeacon.isBluetoothEnabled()
        .then(function(isEnabled) {
          console.log("isBluetoothEnabled: " + isEnabled);
          if (!isEnabled) {
            if (ionic.Platform.isIOS()) {
              // Commented out because it doesn't seem to work on iOS
              /*
              var alertPopup = $ionicPopup.alert({
                template: 'Please turn on Bluetooth to track beacons.'
              });
              */
            } else {
              var alertPopup = $ionicPopup.alert({
                title: '<i class="ion-bluetooth"></i> ' + $translate.instant('bluetooth'),
                template: $translate.instant('turn_on_bluetooth')
              });
            }
          }
        });
    }

    /*
     * --------------------------------------------------------------------
     * QR scanner
     */

    $scope.scanQr = function() {

      $ionicLoading.show();

      $cordovaBarcodeScanner
        .scan()
        .then(function(barcodeData) {
          // Success! Barcode data is here
          if (typeof barcodeData.text === 'undefined' || barcodeData.text == '') {

            // Nothing found, do nothing, only hide loader
            $ionicLoading.hide();

          } else {
            // Update address bar input
            $scope.view.input = barcodeData.text;

            // Open app view and load browser
            ViewService.openView($scope, barcodeData.text, true);

            $ionicLoading.hide();
          }
        }, function(error) {
          // An error occurred
          alert('There was an error trying to use the camera. Make sure you give this app permission to use the camera. [' + error.text + ']');
        });
    };

    /*
     * --------------------------------------------------------------------
     * Enter code
     */

    $scope.enterCode = function() {
      $scope.data = {};
      $scope.data.code = null;
      var enterCodePopup = $ionicPopup.show({
        template: '<input type="text" ng-model="data.code">',
        title: $translate.instant('enter_code'),
        scope: $scope,
        buttons: [{
          text: $translate.instant('cancel')
        }, {
          text: '<b>' + $translate.instant('ok') + '</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!$scope.data.code) {
              //don't allow the user to close unless (s)he enters code
              e.preventDefault();
            } else {
              return $scope.data.code;
            }
          }
        }]
      });

      enterCodePopup.then(function(code) {
        if (typeof code === 'undefined') return;
        console.log('Tapped!', code);
        ViewService.openView($scope, code, true);
      });
    };

  }, false);

  /*
   * ------------------------------------------------------------------------
   * Start tracking (monitoring region + proximity ranging) beacons
   */

  BeaconService.startTrackingBeacons($scope);

  /*
   * ------------------------------------------------------------------------
   * Start monitoring geofences
   */

  GeofenceService.startTrackingGeofences($scope);

  /*
   * Open app view with url in address bar
   */

  $scope.openView = function() {
    ViewService.openView($scope, $scope.view.input, true);
  };

  /*
   * Listen for InAppBrowser events
   */

  $rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event) {});
  $rootScope.$on('$cordovaInAppBrowser:loaderror', function(e, event) {});

  $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event) {
    $cordovaInAppBrowser.show();
    $ionicLoading.hide();
  });

  $rootScope.$on('$cordovaInAppBrowser:exit', function(e, event) {
    inAppBrowser = null;
  });

  /*
   * Check if there're apps loaded by default (config.js)
   */

  if (APPS.default.length > 0) {

    // Check if apps are already loaded
    var apps_default_loaded = $scope.$storage.apps_default_loaded;

    if (apps_default_loaded == null) {
      APPS.default.forEach(function(url) {
        // Apps will be loaded in background, no view will be shown
        var promise = ViewService.openView($scope, url, false, false, true, APPS.persistent, true);

        promise.then(function(data) {
          if (data) {
            $scope.$storage.apps_default_loaded = true;
          } else {
            delete $scope.$storage.apps_default_loaded;
          }
        });
      });
    }
  }

  /*
   * Prevent $apply already in progress error
   */

  $scope.safeApply = function(fn) {
    var phase = this.$root.$$phase;
    if (phase == '$apply' || phase == '$digest') {
      if (fn && (typeof(fn) === 'function')) {
        fn();
      }
    } else {
      this.$apply(fn);
    }
  };
})

/*
 * ---------------------------------------------------
 * Home
 * ---------------------------------------------------
 */

.controller('HomeCtrl', function($scope, view, favs, device, geo, api, beacon, geofence, debug) {

  /*
   * Globals
   */

  $scope.favs = favs;
  $scope.view = view;
  $scope.device = device;
  $scope.geo = geo;
  $scope.api = api;
  $scope.beacon = beacon;
  $scope.geofence = geofence;
  $scope.debug = debug;
})

/*
 * ---------------------------------------------------
 * Favorites
 * ---------------------------------------------------
 */

.controller('AppsCtrl', function($scope, view, favs, device, geo, api, beacon, geofence, debug, $ionicTabsDelegate, $ionicActionSheet, $ionicPopup, $translate, DebugService, DataService, ViewService, DeviceService, BeaconService) {

  /*
   * Globals
   */

  $scope.favs = favs;
  $scope.view = view;
  $scope.device = device;
  $scope.geo = geo;
  $scope.api = api;
  $scope.beacon = beacon;
  $scope.geofence = geofence;
  $scope.debug = debug;

  $scope.showActionSheet = function(name, id, url, locked) {
    locked = (locked == 1) ? true : false;

    if (locked) { // No delete button
      $ionicActionSheet.show({
        buttons: [{
          text: '<i class="icon ion-android-open dark hide-ios"></i> ' + $translate.instant('open_app')
        }],
        titleText: name,
        cancelText: $translate.instant('cancel'),
        cancel: function() {
          return true;
        },
        buttonClicked: function(index) {
  
          // Open app
          if (index == 0) {
            DebugService.log($scope, 'App opened: ' + url);
            ViewService.openView($scope, url);
          }
  
          return true;
        }
      });
    } else { // Show delete button
      $ionicActionSheet.show({
        buttons: [{
          text: '<i class="icon ion-android-open dark hide-ios"></i> ' + $translate.instant('open_app')
        }],
        destructiveText: '<i class="icon ion-android-delete royal hide-ios"></i> ' + $translate.instant('delete_bookmark'),
        titleText: name,
        cancelText: $translate.instant('cancel'),
        cancel: function() {
          return true;
        },
        buttonClicked: function(index) {
  
          // Open app
          if (index == 0) {
            DebugService.log($scope, 'App opened: ' + url);
            ViewService.openView($scope, url);
          }
  
          return true;
        },
        destructiveButtonClicked: function() {
  
          var confirmPopup = $ionicPopup.confirm({
            title: name,
            template: $translate.instant('confirm_delete_bookmark'),
            buttons: [{
              text: $translate.instant('cancel')
            }, {
              text: '<b>' + $translate.instant('ok') + '</b>',
              type: 'button-positive',
              onTap: function(e) {
                DebugService.log($scope, 'App deleted: ' + url);
                DataService.deleteBookmark($scope, id);
              }
            }]
          });
          return true;
        }
      });
    }
  };
})

/*
 * ---------------------------------------------------
 * Content view
 * ---------------------------------------------------
 */

.controller('ContentCtrl', function($scope, $translate, debug, scenario, DebugService, ViewService) {

  /*
   * Globals
   */

  $scope.scenario = scenario;
  $scope.debug = debug;

  if ($scope.scenario.content_title == '') $scope.scenario.content_title = $translate.instant('beacon_history');

  var self = $scope;

  $scope.openContent = function($index, url) {
    $scope.safeApply(function() {
      $scope.scenario.selectedIndex = $index;
      $scope.scenario.history_url = url;
      $scope.scenario.content_title = $scope.scenario.history[$index].title;
      $scope.scenario.content_state = $scope.scenario.history[$index].state;

      ViewService.openView(self, url, false, false);
    });
  };

  /*
   * Callback after iframe is loaded
   */

  $scope.iframeLoadedCallBack = function() {
    $scope.scenario.show_loader = false;
    DebugService.log($scope, 'content iframe loaded');
  };
})

/*
 * ---------------------------------------------------
 * Eddystone
 * ---------------------------------------------------
 */

.controller('EddystoneCtrl', function($scope, ViewService, EddystoneService, view, eddystone, debug) {

  /*
   * Globals
   */

  $scope.view = view;
  $scope.eddystone = eddystone;
  $scope.debug = debug;

  /*
   * Open view
   */

  $scope.openEddystone = function(url) {
    ViewService.openView($scope, url);
  };

  /*
   * ------------------------------------------------------------------------
   * Scan for Eddystone beacons & stop scanning when user leaves
   */

  EddystoneService.scanForBeacons($scope);

  $scope.$on('$locationChangeStart', function() {
    EddystoneService.stopScanningForBeacons($scope);
  });
})

/*
 * ---------------------------------------------------
 * Settings controller
 * ---------------------------------------------------
 */

.controller('SettingsCtrl', function($scope, $localStorage, $translate, DataService, debug) {

  /*
   * Globals
   */

  $scope.debug = debug;
  $scope.language = $translate.use();
  $scope.$storage = $localStorage;

  $scope.changeLanguage = function(language) {
    $scope.$storage.app_language = language;
    $translate.use(language);

    console.log('Language change ' + language);
  };

})

/*
 * ---------------------------------------------------
 * Help controller
 * ---------------------------------------------------
 */

.controller('HelpCtrl', function($scope, view, debug) {

  /*
   * Globals
   */


  $scope.view = view;
  $scope.debug = debug;
})

/*
 * ---------------------------------------------------
 * Debug view
 * ---------------------------------------------------
 */

.controller('DebugCtrl', function($scope, api, view, favs, device, geo, api, beacon, geofence, debug, DataService) {

  /*
   * Globals
   */

  $scope.favs = favs;
  $scope.view = view;
  $scope.device = device;
  $scope.geo = geo;
  $scope.api = api;
  $scope.beacon = beacon;
  $scope.geofence = geofence;
  $scope.debug = debug;

  $scope.clearLog = function() {
    if (confirm('Are you sure?')) {
      $scope.debug.length = 0;
      $scope.debug = [];
    }
  };
});