angular.module('Pundit2.PageItemsContainer')
.controller('PageItemsContainerCtrl', function($scope, PageItemsContainer, ItemsExchange, Preview, TypesHelper) {

    $scope.dropdownTemplate = "src/Toolbar/dropdown.tmpl.html";

    // read by <item> directive (in PageItemsContainer/items.tmpl.html)
    // specifie how action add to contextual menu
    $scope.itemMenuType = PageItemsContainer.options.pageItemsMenuType;
    

    // items property used to compare
    // legal value are: 'type' and 'label'
    var order = PageItemsContainer.options.order;

    // how order items, true is ascending, false is descending
    $scope.reverse = PageItemsContainer.options.reverse;

    // tabs used to filter items list by type (all, text, image and pages)
    $scope.tabs = [
        {
            title: 'All Items',
            template: 'src/Lists/itemList.tmpl.html',
            filterFunction: function(){
                return true;
            }
        },
        {
            title: 'Text',
            template: 'src/Lists/itemList.tmpl.html',
            filterFunction: function(item){
                return item.isTextFragment();
            }
        },
        {
            title: 'Images',
            template: 'src/Lists/itemList.tmpl.html',
            filterFunction: function(item){
                return item.isImage();
            }
        },
        {
            title: 'Pages',
            template: 'src/Lists/itemList.tmpl.html',
            filterFunction: function(item){
                return item.isWebPage();
            }
        }
    ];

    // index of the active tab (the tab that actualy show it content) 
    $scope.tabs.activeTab = PageItemsContainer.options.initialActiveTab;

    // sort button dropdown content
    $scope.dropdownOrdering = [
        { text: 'Label Asc', click: function(){
            order = 'label';
            $scope.reverse = false;
        }},
        { text: 'Label Desc', click: function(){
            order = 'label';
            $scope.reverse = true;
        }},
        { text: 'Type Asc', click: function(){
            order = 'type';
            $scope.reverse = false;
        }},
        { text: 'Type Desc', click: function(){
            order = 'type';
            $scope.reverse = true;
        }}
    ];

    var removeSpace = function(str){
        return str.replace(/ /g,'');
    };

    // getter function used inside template to order items 
    // return the items property value used to order
    $scope.getOrderProperty = function(item){

        if (order === 'label') {
            return removeSpace(item.label);
        } else if (order === 'type') {
            return removeSpace(TypesHelper.getLabel(item.type[0]));
        }

    };

    // every time that change active tab show new items array
    $scope.$watch(function() {
        return $scope.tabs.activeTab;
    }, function(activeTab) {
        $scope.displayedItems = PageItemsContainer.getItemsArrays()[activeTab];
        // disable sort by type dropdown link
        // enable only in All Items tab
        if ($scope.tabs[activeTab].title !== $scope.tabs[0].title) {
            $scope.dropdownOrdering[2].disable = true;
            $scope.dropdownOrdering[3].disable = true;
        } else {
            $scope.dropdownOrdering[2].disable = false;
            $scope.dropdownOrdering[3].disable = false;
        }
    });

    // every time that user digit text inside <input> filter the items showed
    // show only items that contain the $scope.search substring inside their label
    // the match function ignore multiple spaces
    $scope.$watch(function() {
        return $scope.search;
    }, function(str) {

        // All items are shown
        if (typeof($scope.displayedItems) === 'undefined') {
            return;
        }

        // This happens when the user delete last char in the <input>
        if (typeof(str) === 'undefined') {
            str = '';
        }

        // Filter items which are shown
        // go to lowerCase and replace multiple space with single space, to make the regexp
        // work properly
        str = str.toLowerCase().replace(/\s+/g, ' ');
        var strParts = str.split(' ');
            reg = new RegExp(strParts.join('.*'));

        $scope.displayedItems = PageItemsContainer.getItemsArrays()[$scope.tabs.activeTab].filter(function(items){
            return items.label.toLowerCase().match(reg) !== null;
        });

    });

    $scope.$watch(function() {
        return ItemsExchange.getItemsByContainer(PageItemsContainer.options.container);
    }, function(newItems) {
        // update all items array and display new items
        $scope.displayedItems = PageItemsContainer.buildItemsArray($scope.tabs.activeTab, $scope.tabs, newItems);
    }, true);

});