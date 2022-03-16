/**
 * --------------------------------------------------------------------------------------------
 * Factory
 */
angular.module('ngApp.DataFactory', [])

/*
 * Favorites
 */

.factory('favs', function() {
  return {
    items: [],
    loading: true
  };
});

/**
 * --------------------------------------------------------------------------------------------
 * Service
 */

angular.module('ngApp.DataServices', [])

/**
 * Data services
 */

.service('DataService', function($ionicPopup, $q, $cordovaNetwork, ApiService, BeaconService, GeofenceService, DebugService) {

  /**
   * Load favorites
   */

  this.loadFavs = function($scope, http) {
    if (typeof http === 'undefined') http = true;

    if (http) {

      /**
       * Unsubscribe all beacons + geofences
       */

      BeaconService.unsubscribeAll($scope);
      GeofenceService.unsubscribeAll($scope);
    }

    var self = this;

    document.addEventListener("deviceready", function() {
      db.transaction(function(tx) {

        /**
         * Get fav apps
         */

        tx.executeSql("SELECT id, name, icon, url, api, locked FROM favs ORDER BY created ASC;", [], function(tx, result) {

          $scope.favs.items.length = 0;

          if (result.rows.length > 0) {
            for (var i = 0; i < result.rows.length; i++) {
              var id = result.rows.item(i).id;
              var api = result.rows.item(i).api;
              var icon = result.rows.item(i).icon;
              var name = result.rows.item(i).name;
              var url = result.rows.item(i).url;
              var locked = result.rows.item(i).locked;

              if (icon == null || $cordovaNetwork.isOffline()) icon = 'img/icons/globe/120.png';

              $scope.$apply(function() {
                if (url != null) {
                  var fav = {
                    'id': id,
                    'icon': icon,
                    'name': name,
                    'url': url,
                    'api': api,
                    'locked': locked
                  };

                  $scope.favs.items.push(fav);
                }
              });

              if (http && result.rows.item(i).url != null) {

                /**
                 * Post to Proximity Platform API to get latest notification board changes
                 */

                var promise = ApiService.handshake($scope, result.rows.item(i).url, result.rows.item(i));

                promise.then(
                  function(data) { // Request succeeded
                    if (data !== false && data.pass_on !== false) {
                      if (data.content.found) {
                        $scope.api.favorite_notification_boards.push(data);

                        BeaconService.extractFavBeacons($scope);
                        GeofenceService.extractFavGeofences($scope);

                        DebugService.log($scope, 'Fav notification board loaded from remote ↓');
                        DebugService.log($scope, data);

                        db.transaction(function(tx) {
                          tx.executeSql("UPDATE favs SET api = ?, name = ?, icon = ? WHERE id = ?;", [JSON.stringify(data), data.content.name, data.content.icon, data.pass_on.id], function(tx, result) {
                            DebugService.log($scope, 'Api response updated');
                          });
                        });
                      } else {
                        // Remove fav because remote app wasn't found (possibly deleted remotely)
                        self.deleteBookmark($scope, data.pass_on.id);

                        DebugService.log($scope, 'Deleted fav because remote app wasn\'t found');
                      }
                    }
                  },
                  function(response) { // Request failed, use offline api data
                    $scope.api.favorite_notification_boards.push(JSON.parse(api));

                    BeaconService.extractFavBeacons($scope);
                    GeofenceService.extractFavGeofences($scope);

                    DebugService.log($scope, 'Fav notification board loaded from local ↓');
                    DebugService.log($scope, JSON.parse(api));
                  }
                );
              } else {
                // No http
                $scope.$apply();
              }
            };
          }

          $scope.safeApply(function() {
            $scope.favs.loading = false;
          });
        });
      });

    }, false);
  }

  /**
   * Add bookmark
   */

  this.addBookmark = function($scope, locked) {
    var self = this;

    var icon = $scope.view.icon;
    var now = Date.now();
    var url = $scope.view.url;

    if (icon == null) icon = 'img/icons/globe/120.png';
    if (typeof locked === 'undefined') locked = false; // If true, a fav can't be deleted
    locked = (locked == true) ? 1 : 0;

    document.addEventListener("deviceready", function() {
      db.transaction(function(tx) {
        tx.executeSql("SELECT id FROM favs WHERE url = ? AND (name IS NOT NULL AND name <> '');", [url], function(tx, result) {

          if (result.rows.length == 0) {
            db.transaction(function(tx) {
              tx.executeSql("INSERT INTO favs (name, icon, url, api, created, locked) VALUES (?, ?, ?, ?, ?, ?);", [$scope.view.title, icon, url, JSON.stringify($scope.api.active_notification_board), now, locked], function(tx, result) {
                // Reload favorites
                self.loadFavs($scope, false);
              });
            });
          }
        });
      });
    }, false);
  }

  /**
   * Delete bookmark
   */

  this.deleteBookmark = function($scope, id) {
    var self = this;

    document.addEventListener("deviceready", function() {
      db.transaction(function(tx) {
        tx.executeSql("DELETE FROM favs WHERE id = ?;", [id], function(tx, result) {

          DebugService.log($scope, 'Bookmark deleted: #' + id);

          // Reload favorites
          self.loadFavs($scope);

          $scope.view.input
            /*
                      $ionicPopup.alert({
                        title: 'Bookmark deleted'
                      }).then(function(res) {
                        DebugService.log($scope, 'Bookmark deleted: #' + id);
                      });
            */
        });
      });
    }, false);
  }

  /**
   * Get setting
   *
   * var promise = DataService.getSetting('some_setting');
   *
   * promise.then(function(value) {
   *   if (value != null) {
   *     console.log(value);
   *   }
   * });
   *
   */

  this.getSetting = function(name) {
    var self = this;

    // Create a promise for the db transaction
    var deferred = $q.defer();

    document.addEventListener("deviceready", function() {

      /**
       * Create settings table if not exists
       */

      db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS settings (id integer primary key, name text, value text)');

        db.transaction(function(tx) {
          tx.executeSql("SELECT value FROM settings WHERE name = ?;", [name], function(tx, result) {
            var value = (result.rows.length == 0) ? null : result.rows.item(0).value;
            console.log('get setting ' + name + ': ' + value);
            deferred.resolve(value);
          });
        });
      });

    }, false);

    return deferred.promise;
  }

  /**
   * Set setting
   *
   * DataService.setSetting('some_setting');
   *
   */

  this.setSetting = function(name, value) {
    var self = this;

    document.addEventListener("deviceready", function() {

      /**
       * Create settings table if not exists
       */

      db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS settings (id integer primary key, name text, value text)');

        db.transaction(function(tx) {
          tx.executeSql("SELECT id FROM settings WHERE name = ?;", [name], function(tx, result) {
            if (result.rows.length == 0) {
              db.transaction(function(tx) {
                tx.executeSql("INSERT INTO settings (name, value) VALUES (?, ?);", [name, value], function(tx, result) {
                  console.log('Setting ' + name + ' inserted with ' + value);
                });
              });
            } else {
              db.transaction(function(tx) {
                tx.executeSql("UPDATE settings SET value = ? WHERE name = ?;", [value, name], function(tx, result) {
                  console.log('Setting ' + name + ' updated to ' + value);
                });
              });
            }
          });
        });
      });

    }, false);
  }
});