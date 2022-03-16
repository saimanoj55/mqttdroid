/*
 * Used for generic factories
 */
angular.module('ngApp.AppFactory', [])

/*
 * Debug
 */

.factory('debug', function() {
  return {
    nav: false,
    log: []
  };
});