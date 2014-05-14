angular.module('Pundit2.ItemsContainer')
    .directive('itemsContainer', function() {
        return {
            restrict: 'E',
            scope: {
                container: '@'
            },
            templateUrl: "src/ItemsContainer/ItemsContainer.dir.tmpl.html",
            controller: "ItemsContainerCtrl"
        };
    });