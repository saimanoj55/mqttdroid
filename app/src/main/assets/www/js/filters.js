angular.module('ngApp.filters', [])

.filter('trustAsResourceUrl', ['$sce', function($sce) {
  return function(val) {
    return $sce.trustAsResourceUrl(val);
  };
}])

.filter('escapeSingleQuote', function() {
  return function(text) {
    if (text) {
      return text.
      replace(/'/g, '&#39;');
    }
    return '';
  }
});