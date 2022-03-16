angular.module('ngApp.directives', [])

/*
 * Callback when iframe content is loaded
 */

.directive('iframeOnload', [function() {
  return {
    scope: {
      callBack: '&iframeOnload'
    },
    link: function(scope, element, attrs) {
      element.on('load', function() {
        return scope.callBack({
          DOMelement: this
        });
      })
    }
  }
}])

/*
 * Catch enter key input
 */

.directive('myEnter', function() {
  return function(scope, element, attrs) {
    element.bind("keydown keypress", function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.myEnter);
        });

        event.preventDefault();
      }
    });
  };
});