/*
 * Used for generic services
 */
angular.module('ngApp.AppServices', [])

/*
 * Debug service
 */

.service('DebugService', function() {

  /**
   * Log
   */

  this.log = function($scope, log) {
    $scope.debug.log.push(log);
    console.log(log);
  }
});