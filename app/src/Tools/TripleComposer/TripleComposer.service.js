angular.module('Pundit2.TripleComposer')
.constant('TRIPLECOMPOSERDEFAULTS', {

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer
     *
     * @description
     * `object`
     *
     * Configuration for TripleComposer module. Defines: at which panel add the 
     * MyIyemsContainer directive.
     */

     /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.clientDashboardTemplate
     *
     * @description
     * `string`
     *
     * Path of template containing tripleComposer directive, client will append the content of this template 
     * to the DOM (inside dashboard directive) to bootstrap this component.
     *
     * Default value:
     * <pre> clientDashboardTemplate: "src/Tools/TripleComposer/ClientTripleComposer.tmpl.html" </pre>
     */
    clientDashboardTemplate: "src/Tools/TripleComposer/ClientTripleComposer.tmpl.html",

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.clientDashboardPanel
     *
     * @description
     * `string`
     *
     * Name of the panel where append the directive (legal value to default are: 'lists', 'tools' and 'details').
     *
     * Default value:
     * <pre> clientDashboardPanel: "tools" </pre>
     */
    clientDashboardPanel: "tools",

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.clientDashboardTabTitle
     *
     * @description
     * `string`
     *
     * Tab title inside panel dashboard tabs.
     *
     * Default value:
     * <pre> clientDashboardTabTitle: "Statements Composer" </pre>
     */
    clientDashboardTabTitle: "Statements Composer",

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.inputIconSearch
     *
     * @description
     * `string`
     *
     * Icon shown in the search input when it's empty
     *
     * Default value:
     * <pre> inputIconSearch: 'pnd-icon-search' </pre>
     */
    inputIconSearch: 'pnd-icon-search',

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.inputIconClear
     *
     * @description
     * `string`
     *
     * Icon shown in the search input when it has some content
     *
     * Default value:
     * <pre> inputIconClear: 'pnd-icon-times' </pre>
     */
    inputIconClear: 'pnd-icon-times',

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TripleComposer.debug
     *
     * @description
     * `boolean`
     *
     * Active debug log
     *
     * Default value:
     * <pre> debug: false </pre>
     */
    debug: false
    
})
.service('TripleComposer', function(BaseComponent, TRIPLECOMPOSERDEFAULTS, TypesHelper, NameSpace) {

    var tripleComposer = new BaseComponent('TripleComposer', TRIPLECOMPOSERDEFAULTS);

    var nextId = 1;
    var statements = [{
        id: nextId
    }];

    tripleComposer.getStatements = function(){
        return statements;
    };

    tripleComposer.addStatement = function(){
        nextId = nextId + 1;
        statements.push({id: nextId});
    };

    tripleComposer.removeStatement = function(id){
        // at least one statetement must be present
        if (statements.length === 1) {
            statements[0].scope.wipe();
            return;
        }
        
        statements.some(function(s, i){
            if (s.id === id) {
                index = i;
                return true;
            }
        });        
        if (index > -1) {
            statements.splice(index, 1);
        }
    };

    tripleComposer.reset = function(){
        nextId = 1;
        statements = [{
            id: nextId
        }];
        return statements;
    };

    // extend arr object with scope property
    tripleComposer.addStatementScope = function(id, scope){
        statements.some(function(s, i){
            if (s.id === id) {
                index = i;
                return true;
            }
        });
        
        if (index > -1) {
            statements[index].scope = scope;
        }
    };

    // duplicate a statement and add it to the statements array
    // this produce the view update and a new <statement> directive
    // is added to the triple composer directive
    tripleComposer.duplicateStatement = function(id){
        statements.some(function(s, i){
            if (s.id === id) {
                index = i;
                return true;
            }
        });
        
        if (index > -1) {
            nextId = nextId + 1;
            statements.push({
                id: nextId,
                scope: {
                    duplicated: statements[index].scope.copy()
                }
            });
        }

    };

    // TODO to fix (used to add a subject from outside of triple composer)
    tripleComposer.addToSubject = function(item) {
        if (statements.length === 1 && statements[0].scope.get().subject === null) {
            statements[0].scope.get().subject = item;

            statements[0].scope.subjectLabel = item.label;
            statements[0].scope.subjectTypeLabel = TypesHelper.getLabel(item.type[0]);
            statements[0].scope.subjectFound = true;
        } else {
            // add blank statement then insert subject
        }
    };

    tripleComposer.isAnnotationComplete = function(){
        var complete = true;
        statements.some(function(s){
            if (!s.scope.isStatementComplete()) {
                complete = false;
                return true;
            }
        });
        return complete;
    };

    // build the items object used inside http call
    tripleComposer.buildItems = function(){
        var res = {};
        
        statements.forEach(function(el){
            var triple = el.scope.get();

            // add item and its rdf properties
            res[triple.subject.uri] = triple.subject.toRdf();

            res[triple.predicate.uri] = triple.predicate.toRdf();

            // discard literals
            if (typeof(triple.object.uri) !== 'undefined') {
                res[triple.object.uri] = triple.object.toRdf();

                triple.object.type.forEach(function(e, i){
                    var type = triple.object.type[i];
                    res[type] = { };
                    res[type][NameSpace.rdfs.label] = [{type: 'literal', value: TypesHelper.getLabel(e)}];
                });
            }                                

            // add subject types and its label
            triple.subject.type.forEach(function(e, i){
                var type = triple.subject.type[i];
                res[type] = { };
                res[type][NameSpace.rdfs.label] = [{type: 'literal', value: TypesHelper.getLabel(e)}];
            });

            // add predicate types and its label
            triple.predicate.type.forEach(function(e, i){
                var type = triple.predicate.type[i];
                res[type] = { };
                res[type][NameSpace.rdfs.label] = [{type: 'literal', value: TypesHelper.getLabel(e)}];
            });

        });

        return res;
    };

    tripleComposer.buildObject = function(item){
        if (typeof(item) === 'string') {
            // date or literal
            return {type: 'literal', value: item};
        } else {
            return {type: 'uri', value: item.uri};
        }
    };

    tripleComposer.buildTargets = function(){
        var res = [];

        statements.forEach(function(el){
            var triple = el.scope.get();

            if (triple.subject.isTextFragment() || triple.subject.isImage() || triple.subject.isImageFragment() ){
                if (res.indexOf(triple.subject.uri) === -1) {
                    res.push(triple.subject.uri);
                }
            }
            if (triple.predicate.isTextFragment() || triple.predicate.isImage() || triple.predicate.isImageFragment() ){
                if (res.indexOf(triple.predicate.uri) === -1) {
                    res.push(triple.predicate.uri);
                }
            }

            if (typeof(triple.object) !== 'string') {
                if (triple.object.isTextFragment() || triple.object.isImage() || triple.object.isImageFragment() ){
                    if (res.indexOf(triple.object.uri) === -1) {
                        res.push(triple.object.uri);
                    }
                }
            }
        });

        return res;
    };

    tripleComposer.buildGraph = function(){
        var res = {};

        statements.forEach(function(el){
            var triple = el.scope.get();
            
            if (typeof(res[triple.subject.uri]) === 'undefined' ) {
                // subject uri not exist (happy it's easy)
                res[triple.subject.uri] = {};
                // predicate uri not exist
                res[triple.subject.uri][triple.predicate.uri] = [tripleComposer.buildObject(triple.object)];
            } else {
                // subject uri already exists

                if (typeof(res[triple.subject.uri][triple.predicate.uri]) === 'undefined') {
                    // predicate uri not exist (happy it's easy)
                    res[triple.subject.uri][triple.predicate.uri] = [tripleComposer.buildObject(triple.object)];
                } else {

                    // predicate uri already exists
                    var u = triple.object.uri,
                        arr = res[triple.subject.uri][triple.predicate.uri];
                    // search object
                    var found = arr.some(function(o){
                        return angular.equals(o.value, u);
                    });
                    // object not eqaul (happy it's easy)
                    if (!found) {
                        arr.push(tripleComposer.buildObject(triple.object));
                    }

                }
                
            }

        });

        return res;
    };

    return tripleComposer;

});