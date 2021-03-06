angular.module('Pundit2.Communication')

.factory('Annotation', function(BaseComponent, NameSpace, Utils, Item, TypesHelper, Analytics,
    AnnotationsExchange, Consolidation, MyPundit, ItemsExchange, PageItemsContainer,
    $http, $q) {

    var annotationComponent = new BaseComponent("Annotation");

    // Creates a new Annotation instance. If an id is passed in
    // then the annotation is loaded, otherwise a new annotation
    // is created on the server
    function Annotation(id, useCache) {
        this._q = $q.defer();

        if (typeof(id) !== "undefined") {
            this.id = id;
            this.load(useCache);
        } else {
            this.create();
        }

        // Add it to the exchange, ready to be .. whatever will be.
        AnnotationsExchange.addAnnotation(this);
    }

    Annotation.prototype.create = function(triple) {
        annotationComponent.log('Creating a new Annotation on the server');
        this._q.resolve('New annotation created: TODO, after LOGIN');
    };

    // update local annotation info reading from server
    Annotation.prototype.update = function() {

        var self = this,
            promise = $q.defer();

        $http({
            headers: {
                'Accept': 'application/json'
            },
            method: 'GET',
            url: NameSpace.get('asAnn', {
                id: self.id
            }),
            withCredentials: true
        }).success(function(data) {

            // update info
            readAnnotationData(self, data);

            promise.resolve();
            annotationComponent.log("Retrieved annotation " + self.id + " metadata");
        }).error(function(data, statusCode) {
            promise.reject();
            annotationComponent.err("Error getting annotation " + self.id + ". Server answered with status code " + statusCode);
        });

        return promise.promise;
    };

    Annotation.prototype.load = function(useCache) {
        var self = this,
            nsKey = (MyPundit.isUserLogged()) ? 'asAnn' : 'asOpenAnn';

        if (typeof(useCache) === "undefined") {
            useCache = true;
        }

        annotationComponent.log("Loading annotation " + self.id + " with cache " + useCache);

        var httpPromise;
        httpPromise = $http({
            headers: {
                'Accept': 'application/json'
            },
            method: 'GET',
            cache: useCache,
            url: NameSpace.get(nsKey, {
                id: self.id
            }),
            withCredentials: true

        }).success(function(data) {

            readAnnotationData(self, data);

            // TODO: if ret, resolve() .. otherwise reject()?
            // TODO: the annotation might be corrupted (no items? no something..)
            // TODO: set an error flag and let the user try load() again?

            self._q.resolve(self);
            annotationComponent.log("Retrieved annotation " + self.id + " metadata");
            Analytics.track('api', 'get', 'annotation');

        }).error(function(data, statusCode) {

            // TODO: 404 not found, nothing to do about it, but 403 forbidden might be
            // recoverable by loggin in??
            self._q.reject("Error from server while retrieving annotation " + self.id + ": " + statusCode);
            annotationComponent.err("Error getting annotation " + self.id + ". Server answered with status code " + statusCode);
            Analytics.track('api', 'error', 'get annotation', statusCode);

        });

    };

    Annotation.prototype.isBroken = function() {
        var items = this.items;
        var currentItem;

        // TODO: add support for web pages and external text/image fragment

        for (var i in items) {
            currentItem = ItemsExchange.getItemByUri(items[i].uri);
            if (currentItem.isTextFragment() || currentItem.isImage() || currentItem.isImageFragment() || currentItem.isWebPage()) {
                if (Consolidation.isConsolidated(currentItem)) {
                    return false;
                }
            }
        }
        return true;
    };

    // Returns true if the annotation has been parsed correctly and entirely
    var readAnnotationData = function(ann, data) {

        // Data _must_ contain .graph, .metadata and .items .. and be defined.
        if (typeof(data) === "undefined" ||
            typeof(data.graph) === "undefined" ||
            typeof(data.metadata) === "undefined" ||
            typeof(data.items) === "undefined") {
            annotationComponent.err('Malformed annotation id=' + ann.id + ': ', data);
            return false;
        }

        ann.items = {};
        ann.graph = angular.copy(data.graph);

        // For some weird reason, the first level of the object is
        // is the annotation's URI
        for (var i in data.metadata) {
            ann.uri = i;
        }

        // if there wasnt that first level ... not good news.
        if (typeof(ann.uri) === "undefined") {
            annotationComponent.err('Malformed annotation id=' + ann.id + ', wrong metadata: ', data);
            return false;
        }

        var ns = NameSpace.annotation,
            annData = data.metadata[ann.uri];

        // Those properties are a single value inside an array, read them
        // one by one by using the correct URI taken from the NameSpace,
        // doing some sanity checks
        for (var property in ns) {
            var propertyURI = ns[property];

            if (propertyURI in annData) {
                ann[property] = annData[propertyURI][0].value;
            } else {
                ann[property] = '';
            }
        }

        // .isIncludedIn is an URI, get out the id too
        if (ns.isIncludedIn in annData) {
            ann.isIncludedInUri = annData[ns.isIncludedIn][0].value;
            var isIncludedIn = ann.isIncludedInUri.match(/[a-z0-9]*$/);
            if (isIncludedIn !== null) {
                ann.isIncludedIn = isIncludedIn[0];
            }
        }

        // .target is always an array
        if (ns.target in annData) {
            ann.target = [];

            for (var t = 0; t < annData[ns.target].length; t++) {
                ann.target.push(annData[ns.target][t].value);
            }

        }

        // Extract all of the entities and items involved in this annotation:
        // subjects and objects which are NOT literals. Extract all of the predicates
        // involved too
        ann.entities = [];
        ann.predicates = [];
        for (var s in data.graph) {

            if (ann.entities.indexOf(s) === -1) {
                ann.entities.push(s);
                ann.items[s] = {};
            }

            for (var p in data.graph[s]) {

                if (ann.entities.indexOf(p) === -1) {
                    // Some annotations dont have a proper item for the predicate, supply
                    // at least a type so we dont get confused ..
                    ann.items[p] = {
                        type: [NameSpace.rdf.property],
                        label: Utils.getLabelFromURI(p)
                    };
                    if (ann.predicates.indexOf(p) === -1) {
                        ann.predicates.push(p);
                    }
                }

                for (var o in data.graph[s][p]) {
                    var object = data.graph[s][p][o];
                    if (object.type === "uri" && ann.entities.indexOf(object.value) === -1) {
                        ann.entities.push(object.value);
                        ann.items[object.value] = {};
                    }
                } // for o (objects)
            } // for p (predicates)
        } // for s (subjects)

        // Create a real Item for each previously identified item
        for (var uri in ann.items) {

            // This item might exist already (my item? another annotation?). If it does not
            // exist, create it from this annotation content
            var item = ItemsExchange.getItemByUri(uri);
            if (typeof(item) === "undefined") {

                // If it's not empty, let ItemFactory extend it with the previously gathered
                // values
                if (angular.equals(ann.items[uri], {})) {
                    item = new Item(uri);
                } else {
                    item = new Item(uri, ann.items[uri]);
                }

                if (item.isProperty()) {
                    // Add specific flag, this properties are deleted if an other property 
                    // with the same uri is added
                    item.isAnnotationProperty = true;
                }

                // And read what the annotation says about the item
                item.fromAnnotationRdf(data.items);
            }

            // discard predicates
            if (!item.isProperty()) {
                // Add the item to the page items container
                ItemsExchange.addItemToContainer(item, PageItemsContainer.options.container);
            }

            // Help out by giving the types to the helper, UI will say thanks
            for (var z in item.type) {
                TypesHelper.addFromAnnotationRdf(item.type[z], data.items);
            }

            ann.items[uri] = item;
        } // for uri in ann.items

    }; // readAnnotationData()

    // Returns a promise associated with an annotation. The user will
    // get the annotation using .then(success, error). The annotation
    // will load its content as soon as possible and resolve the
    // promise.
    function AnnotationFactory(id, useCache) {
        var nb = new Annotation(id, useCache);
        return nb._q.promise;
    }

    annotationComponent.log('Component up and running');

    return AnnotationFactory;
});