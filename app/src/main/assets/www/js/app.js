var app_status = 'loading';
var inAppBrowser = null;
var inAppBrowserTarget = '_blank';
var db, inAppBrowserCfg;
var beacon_scenarios = Array();
var geofence_scenarios = Array();

var ngApp = angular.module('ngApp', [
  'ionic',
  'pascalprecht.translate',
  'ngCordova',
  'ngResource',
  'ngStorage',
  'ngCordovaBeacon',
  'angularMoment',
  'ngApp.controllers',
  'ngApp.directives',
  'ngApp.filters',
  'ngApp.AppFactory',
  'ngApp.AppServices',
  'ngApp.ApiFactory',
  'ngApp.ApiServices',
  'ngApp.DataFactory',
  'ngApp.DataServices',
  'ngApp.ViewFactory',
  'ngApp.ViewServices',
  'ngApp.DeviceFactory',
  'ngApp.DeviceServices',
  'ngApp.BeaconFactory',
  'ngApp.GeofenceServices',
  'ngApp.GeofenceFactory',
  'ngApp.EddystoneServices',
  'ngApp.EddystoneFactory',
  'ngApp.BeaconServices',
  'ngApp.ScenarioFactory',
  'ngApp.ScenarioServices'
])

.run(function($ionicPlatform, $cordovaStatusbar, $window, $localStorage, $translate) {

  $ionicPlatform.ready(function() {
    if (ionic.Platform.isIOS()) {
      // Ask permission for notifications (required for iOS)
      $window.plugin.notification.local.registerPermission();

      // Ask permission for background location
      // Required for iOS when monitoring beacons when app is in background
      $window.cordova.plugins.locationManager.requestAlwaysAuthorization();
    }

    // Get language from localStorage
    var app_language = $localStorage.app_language;

    if (app_language == null)
    {
      if (typeof navigator.globalization !== "undefined") {
        navigator.globalization.getPreferredLanguage(function(language) {
          $translate.use((language.value).split("-")[0]).then(function(data) {
            console.log("getPreferredLanguage SUCCESS -> " + data);
          }, function(error) {
            console.log("getPreferredLanguage ERROR -> " + error);
          });
        }, null);
      }
    } else {
      $translate.use(app_language);
    }

    // If we have the keyboard plugin, let use it
    if (window.cordova && window.cordova.plugins.Keyboard) {
      // Lets hide the accessory bar fo the keyboard (ios)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      // Also, lets disable the native overflow scroll
      cordova.plugins.Keyboard.disableScroll(true);
    }

    document.addEventListener("pause", function() {
      app_status = 'pause';
    }, false);
    document.addEventListener("resume", function() {
      app_status = 'resume';
    }, false);
    document.addEventListener("deviceready", function() {
      app_status = 'ready';
    }, false);

    // InAppBrowser config based on platform
    if (ionic.Platform.isIOS()) {
      inAppBrowserCfg = {
        hidden: 'yes',
        location: 'no',
        clearcache: 'no',
        toolbar: 'yes'
      };
    } else {
      inAppBrowserCfg = {
        hidden: 'yes',
        location: 'yes',
        clearcache: 'no',
        toolbar: 'yes'
      };
    }
  });
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $translateProvider, $sceDelegateProvider) {

  $translateProvider.useSanitizeValueStrategy(null);

  $translateProvider.useStaticFilesLoader({
    prefix: 'i18n/',
    suffix: '.json'
  });

  $translateProvider.preferredLanguage('en');
  $translateProvider.fallbackLanguage('en');

  $ionicConfigProvider.backButton.previousTitleText(false).text('');
  $ionicConfigProvider.views.transition('none');

  $sceDelegateProvider.resourceUrlWhitelist(['self', '**']);

  $stateProvider
    .state('nav', {
      url: '/nav',
      abstract: true,
      templateUrl: 'nav.html',
      controller: 'NavCtrl'
    })
    .state('nav.home', {
      url: '/home',
      cache: true,
      views: {
        'mainView': {
          templateUrl: 'home.html',
          controller: 'HomeCtrl'
        }
      }
    })
    .state('nav.apps', {
      url: '/apps',
      cache: false,
      views: {
        'mainView': {
          templateUrl: 'templates/apps.html',
          controller: 'AppsCtrl'
        }
      }
    })
    .state('nav.beacons', {
      url: '/beacons',
      cache: true,
      views: {
        'mainView': {
          templateUrl: 'templates/beacons.html',
          controller: 'ContentCtrl'
        }
      }
    })
    .state('nav.debug', {
      url: '/debug',
      cache: false,
      views: {
        'mainView': {
          templateUrl: 'templates/debug.html',
          controller: 'DebugCtrl'
        }
      }
    })
    .state('nav.eddystone', {
      url: '/eddystone',
      cache: false,
      views: {
        'mainView': {
          templateUrl: 'templates/eddystone.html',
          controller: 'EddystoneCtrl'
        }
      }
    })
    .state('nav.settings', {
      url: '/settings',
      cache: true,
      views: {
        'mainView': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('nav.help', {
      url: '/help',
      cache: true,
      views: {
        'mainView': {
          templateUrl: 'templates/help.html',
          controller: 'HelpCtrl'
        }
      }
    });

  $urlRouterProvider.otherwise('/nav/home');

});