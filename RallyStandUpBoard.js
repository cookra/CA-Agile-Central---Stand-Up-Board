function onLoad() {


    RALLY.toolkit.HTML.createMaskLayer();

    var statusDiv = null;
    var setStatus = function(msg) {
        if (!statusDiv) {
            statusDiv = Dom.get('status');
        }

        if (msg) {
            RALLY.toolkit.HTML.enableMask(null, 0);
            Dom.addClass(window.document.body, 'show-progress');
        } else {
            RALLY.toolkit.HTML.disableMask();
            Dom.removeClass(window.document.body, 'show-progress');
        }

        statusDiv.innerHTML = msg || '';
    }

    var insideRally = RALLY.toolkit.insideRally();
    var showActuals = true;
    var currentProjectOid = '__PROJECT_OID__';
    var projectScopeUp = '__PROJECT_SCOPING_UP__' == 'true';
    var projectScopeDown = '__PROJECT_SCOPING_DOWN__' == 'true';

    // use this to rebuild the full query, stitching in the
    // project scoping information from the top-level variables above
    function getQuery() {
        var scoping = "&project=${currentProject}&projectScopeUp=" + projectScopeUp + "&projectScopeDown=" + projectScopeDown;
        var paging = "&pagesize=100";

        return {
            "currentProject"   : "/iteration:current/project",
            "#storyType"        : "/typedefinition?query=(Name = \"Hierarchical Requirement\")",

            "taskUnit"          : "${iteration/workspace/workspaceConfiguration/taskUnitName}",
            "storyStates"       : "${#storyType/attributes[name=schedule state]/allowedvalues/stringvalue}",

            "iteration"         : "/iteration:current?fetch=name,objectid&order=StartDate",
            "iterations"        : "/iterations?fetch=name,objectid&order=StartDate,Name&project=${currentProject}&projectScopeUp=false&projectScopeDown=false" + paging,

            "users"             : "/users?fetch=displayname,loginname,emailaddress,objectid" + paging,

            "tasks"             : "/tasks?fetch=taskindex,name,objectid,formattedid,owner,blocked,blockedreason,estimate,todo,actuals,state,workproduct&query=(Iteration = ${iteration})" + scoping + paging,

            "stories"           : "/hierarchicalrequirement?fetch=rank,blocked,blockedreason,formattedid,name,objectid,owner,project,schedulestate,taskestimatetotal,taskremainingtotal,taskactualtotal,tasks,alternatename&order=Rank&query=(Iteration = ${iteration})" + scoping + paging,
            "defects"           : "/defect?fetch=rank,blocked,blockedreason,formattedid,name,objectid,owner,project,schedulestate,taskestimatetotal,taskremainingtotal,taskactualtotal,requirement&order=Rank&query=(Iteration = ${iteration})" + scoping + paging,
            "defectsuite"       : "/defectsuite?fetch=rank,blocked,blockedreason,formattedid,name,objectid,owner,project,schedulestate,taskestimatetotal,taskremainingtotal,taskactualtotal&order=Rank&query=(Iteration = ${iteration})" + scoping + paging,
            "testsets"          : "/testset?fetch=rank,blocked,blockedreason,formattedid,name,objectid,owner,project,schedulestate,taskestimatetotal,taskremainingtotal,taskactualtotal&query=(Iteration = ${iteration})" + scoping + paging
        };
    }

    var query = getQuery();

    var renderTimeCell = function(label, value, c) {
        var v = (Lang.isValue(value)) ? value : '-';
        return '<div class="' + c + '"><div>' + label + '</div><span>' + v + '</span></div>';
    };

    var projScopeUpControl = Dom.get('proj_scope_up_control');
    var projScopeDownControl = Dom.get('proj_scope_down_control');
    if (insideRally) {
        Dom.setStyle(Dom.get('project'), 'display', 'none');
    } else {
        projScopeUpControl.checked = projectScopeUp;
        projScopeDownControl.checked = projectScopeDown;

        var updateAfterScopeChange = function(e) {
            var src = Event.getTarget(e);
            if (src.id == 'proj_scope_up_control') {
                projectScopeUp = src.checked;
            }
            else if (src.id == 'proj_scope_down_control') {
                projectScopeDown = src.checked;
            }
            query = getQuery();

            RALLY.toolkit.showMessage('Refreshing iteration with selected project scoping');
            gridController.display();
        };

        Event.addListener(projScopeUpControl, 'click', updateAfterScopeChange);
        Event.addListener(projScopeDownControl, 'click', updateAfterScopeChange);
    }

    var viewConfig = {

        // configure columns
        columnAttribute: "State",
        columnValuesAccessor: function(model, modelSchema) {
            var stateOptions = modelSchema.Task.State.options;
            var stateNames = [];
            for (var i = 0, length = stateOptions.length; i < length; i++) {
                stateNames.push(stateOptions[i].Value);
            }
            return stateNames;
        },
        columnHeaderRenderer: function(container, value) {
            container.innerHTML = value;
        },

        // configure rows
        rowAttribute: "WorkProduct",
        rowKeyAccessor: function(workProduct) {
            return workProduct.ObjectID;
        },
        rowValuesAccessor: function(model, modelSchema) {
            return model.items[0].workProducts;
        },
        rowHeaderRenderer: function(container, value, modelSchema) {
            var state,
                    html = [],
                    schema = modelSchema.WorkProduct,
                    owner,
                    ownerClass = ['owner'],
                    divId = 'rally-workprod-' + value.ObjectID,
                    divClass = ['rally-workprod'],
                    timeClass = ['rally-time'];
            // owner could be an object literal, or a string (if the user has been deleted in the app)
            if (!value.Owner) {
                ownerClass.push('de-emphasis');
                owner = gridController.noOwnerLabel;
            } else if (Lang.isObject(value.Owner)) {
                owner = value.Owner._refObjectName;
            } else {
                ownerClass.push('de-emphasis deleted-owner');
                owner = value.Owner;
            }

            if (value.ScheduleState == 'Accepted') {
                divClass.push('rally-workprod-accepted');
                divClass.push('de-emphasis');
            } else if (value.TaskRemainingTotal == '' || value.TaskRemainingTotal == 0) {
                timeClass.push('de-emphasis');
            }
	    if(value.ScheduleState == 'Completed'){
		Dom.addClass(container,'completed');
	    }
	    if(value.Blocked){
		Dom.addClass(container,'blocked');
	    }

            html.push('<div class="' + divClass.join(' ') + '" id="' + divId + '">');

            state = new RALLY.toolkit.renderer.StateRenderer({
                schema: schema.State,
                state: value.ScheduleState,
                blocked: value.Blocked
            });
            html.push('<div class="state">' + state.display(false, value.ScheduleState == 'Accepted') + '</div>');
	    var regexp = /^DE/;
            var detail_type = 'ar';
            if( regexp.test( value.FormattedID ) ) {
              detail_type = 'df';
            }
            html.push('<div class="id"><a href="/slm/detail/' + detail_type + '/' + value.ObjectID + '" target="story-window">' + value.FormattedID + '</a>: <b>' + (value.AlternateName==null ? (value.Requirement ==null ? '' : value.Requirement.FormattedID) : value.AlternateName) + '</b></div>');
            html.push('<div class="name">' + RALLY.toolkit.niceSubstring(value.Name, 100) + '</div>');
            html.push('<div class="' + ownerClass.join(' ') + '">' + owner + '</div>');

            html.push(renderTimeCell((schema.TaskEstimateTotal) ? schema.TaskEstimateTotal.DisplayName : 'Est', value.TaskEstimateTotal, timeClass.join(' ')));
            html.push(renderTimeCell((schema.TaskRemainingTotal) ? schema.TaskRemainingTotal.DisplayName : 'To Do', value.TaskRemainingTotal, timeClass.join(' ')));
            if (showActuals) {
                html.push(renderTimeCell((schema.TaskActualTotal) ? schema.TaskActualTotal.DisplayName : 'Actuals', value.TaskActualTotal, timeClass.join(' ')));
            }

            html.push('<div class="clear"></div>');
            html.push('</div>');

            container.innerHTML = html.join('');
        },

        // configure cells
        cellSortFunction: function(a, b) {
            return a - b;
        },

        // configure items
        itemRankAccessor: function(item) {
            return item.TaskIndex
        },
        itemKeyAccessor: function(item) {
            return item.ObjectID
        },
        itemsAccessor: function(model) {
            return model.items[0].tasks;
        },
        itemRenderer: function(container, item, modelSchema) {
            var html = [],
                    owner,
                    taskClass = ['rally-task'],
                    ownerClass = ['owner'],
                    estClass = ['rally-time'],
                    todoClass = ['rally-time'],
                    actClass = ['rally-time'],
                    schema = modelSchema.Task,
                    contentStyle = '',
                    editIconId = 'edit-' + Dom.generateId(),
                    deleteIconId = 'delete-' + Dom.generateId();

            // owner could be an object literal, or a string (if the user has been deleted in the app)
            if (!item.Owner) {
                ownerClass.push('de-emphasis');
                owner = gridController.noOwnerLabel;
            } else if (Lang.isObject(item.Owner)) {
                owner = item.Owner._refObjectName;
            } else {
                ownerClass.push('de-emphasis deleted-owner');
                owner = item.Owner;
            }

            if (item.Blocked) {
                taskClass.push('rally-task-blocked');
            }
            if (item.State == 'Defined') {
                todoClass.push('de-emphasis');
                actClass.push('de-emphasis');
            } else if (item.State == 'Completed') {
                todoClass.push('de-emphasis');
            }

            if (item.WorkProduct && item.WorkProduct.ScheduleState == 'Accepted') {
                taskClass.push('rally-task-accepted');
                taskClass.push('de-emphasis');
            }

            html.push('<div class="' + taskClass.join(' ') + '" id="rally-task-' + item.ObjectID + '">');
            html.push('<div class="actions">');
            html.push('<img id="' + editIconId + '" src="' + RALLY.toolkit.Connection.getServerURL() + '/images/icon_pencil.gif" alt="Edit" />');
            html.push('<img id="' + deleteIconId + '" src="' + RALLY.toolkit.Connection.getServerURL() + '/images/icon_delete.gif" alt="Delete" />');
            html.push('</div>');

            if (item.Owner && Lang.isValue(item.Owner.ObjectID)) {
                // if there is an image, we need to pad the content to account for it
                contentStyle = 'margin-left: 70px';
                html.push('<div class="image" style="width:25%">');
                html.push('<img id="edit-control" src="' + RALLY.toolkit.Connection.getServerURL() + '/profile/viewThumbnailImage.sp?tSize=60&uid=' + item.Owner.ObjectID + '" alt="" />');
	        html.push('<div class="' + ownerClass.join(' ') + '">' + owner + '</div>');
                html.push('</div>');
            }

            html.push('<div style="' + contentStyle + '">');
            html.push('<div class="id"><a href="/slm/detail/tk/' + item.ObjectID + '" target="task-window">' + item.FormattedID + '</a></div>');
            html.push('<div class="name">' + RALLY.toolkit.niceSubstring(item.Name) + '</div>');


            html.push('<div class="time">');
            html.push(renderTimeCell((schema.Estimate) ? schema.Estimate.ShortName : 'Est', item.Estimate, estClass.join(' ')));
            html.push(renderTimeCell((schema.ToDo) ? schema.ToDo.ShortName : 'To Do', item.ToDo, todoClass.join(' ')));
            if (showActuals) {
                html.push(renderTimeCell((schema.Actuals) ? schema.Actuals.ShortName : 'Actuals', item.Actuals, actClass.join(' ')));
            }
            html.push('<div class="clear"></div>');
            html.push('</div>');
            html.push('</div>');

            if (item.Blocked) {		
                html.push('<img class="blocked-icon" src="' + RALLY.toolkit.Connection.getServerURL() + '/images/icon_blocked.gif" alt="Blocked" />');		;
                html.push('<div class="clear"></div>');
            }

            html.push('</div>');

            container.innerHTML = html.join('');

            Event.purgeElement(editIconId);
            Event.addListener(editIconId, 'click', function(e) {
                gridController.showEditor(item, schema);
            });
            Event.purgeElement(deleteIconId);
            Event.addListener(deleteIconId, 'click', function(e) {
                gridController.deleteItem(item);
            });
        },

        // configure drag event
        dragDropCallback: function(item, value) {

            setStatus('Saving changes...');

            var cell = this.getRenderedItem(item);
            if (cell) {
                var anim = new YAHOO.util.ColorAnim(cell, { backgroundColor: { from: '#F5F4CD', to: '#fff' } });
                anim.animate();
            }
            gridController.saveChanges(item, { 'State': value }, 'taskboard', function() {
                setStatus();
            });
        }
    };

    RALLY.toolkit.Controller = function(query, viewConfig) {
        this.query = query;
        this.schemaConfig = {};
        this.viewConfig = viewConfig;
        this.dataSource = new RALLY.toolkit.TaskboardDataSource(query, '__SERVER_URL__');
        this.view = new RALLY.toolkit.Grid('taskboard', this.viewConfig);
        this.editor = new RALLY.toolkit.Editor();
    };

    RALLY.toolkit.Controller.prototype = {
        acceptedCookieKey:  'taskboard-hide-accepted',
        ownerCookieKey:     'taskboard-filter-by-owner',
        iterationCookieKey: 'taskboard-filter-by-iteration',
        projectOidCookieKey:'taskboard-current-project',
        noOwnerLabel:       'No Owner',
        allOwnersLabel:     'All Team Members',

        getIterationByOid: function(objectID) {
            for (var i = 0; i < this.iterations.length; i++) {
                if (this.iterations[i].ObjectID == objectID) {
                    return this.iterations[i];
                }
            }

            return null;
        },

        display: function(iterationOid) {
            var len, iterations, selectedIteration,
                    html = [],
                    that = this,
                    itr = (iterationOid) ? iterationOid : RALLY.toolkit.Cookie.get(this.iterationCookieKey) || '',
                    projectOid = RALLY.toolkit.Cookie.get(this.projectOidCookieKey),
                    curProjectOid = (currentProjectOid != '') ? currentProjectOid : null;

            // if our selcted project has changed, reset the iteration ObjectID in the cookie
            if (projectOid != curProjectOid) {
                itr = '';
                RALLY.toolkit.Cookie.remove(this.iterationCookieKey);
            }
            RALLY.toolkit.Cookie.add(this.projectOidCookieKey, curProjectOid);

            // re-write the query to scope to the specified iteration
            if (itr) {
                query.iteration = "/iterations?fetch=name,objectid&order=StartDate&query=(ObjectID = " + itr + ")";
            } else {
                query.iteration = "/iteration:current?fetch=name,objectid&order=StartDate";
            }

            setStatus('Loading...');

            if (this.dataSource) {
                var queryWithParams = {
                    adHocQuery: query,
                    cpoid: currentProjectOid
                };
                this.dataSource.get(function(model) {
                    var i;

                    that.hideAcceptedControl = Dom.get('hide_accepted_control');
                    that.iterationSelect = Dom.get('change_iteration_control');

                    // clear out the grid container and any state-dependant vars
                    YAHOO.util.Dom.get('taskboard').innerHTML = '';
                    that.users = [];
                    YAHOO.util.Event.removeListener(that.hideAcceptedControl, 'click');
                    YAHOO.util.Event.removeListener(that.iterationSelect, 'change');


                    if (model.errors.length > 0) {
                        html.push('<ul>');
                        for (i = 0,len = model.errors.length; i < len; i++) {
                            html.push('<li>' + model.errors[i].message + '</li>');
                        }
                        html.push('</ul>');

                        RALLY.toolkit.showError(html.join(''));
                        setStatus();
                        return;
                    } else if (model.items.length == 0 || (model.items.length == 1 && model.items[0].iteration == null)) {
                        RALLY.toolkit.showError('There are no stories to display in the selected project');
                        setStatus();
                        return;
                    }

                    // add in the header info
                    Dom.get('proj_name').innerHTML = model.items[0].project.Name;
                    Dom.get('info').innerHTML = (model.items[0].iteration.Name || '') + '<br/>' + (RALLY.Date.formatNow());

                    // build the iteration select
                    selectedIteration = RALLY.toolkit.Cookie.get(that.iterationCookieKey);
                    iterations = model.items[0].iterations;
                    that.iterations = model.items[0].iterations;
                    RALLY.toolkit.HTML.clearSelect(that.iterationSelect);
                    for (i = 0,len = iterations.length; i < len; i++) {
                        that.iterationSelect.options[that.iterationSelect.options.length] = new Option(iterations[i].Name, iterations[i].ObjectID);
                        if (iterations[i].ObjectID == selectedIteration || iterations[i].Name == model.items[0].iteration.Name) {
                            RALLY.toolkit.Cookie.add(that.iterationCookieKey, iterations[i].ObjectID);
                            that.iterationSelect.selectedIndex = i;
                        }
                    }
                    Event.removeListener(that.iterationSelect, 'change');
                    Event.addListener(that.iterationSelect, 'change', that.updateIteration, that, true);

                    if (model.items[0].tasks.length == 0 && model.items[0].workProducts.length == 0) {
                        RALLY.toolkit.showError('There are no stories to display for the given iteration');
                        setStatus();
                        return;
                    }

                    // build the grid
                    that.view.display(model);

                    // should we hide accepted work?
                    if (RALLY.toolkit.Cookie.get(that.acceptedCookieKey) == 'true' || RALLY.toolkit.Cookie.get(that.acceptedCookieKey) == null) {
                        that.hideAcceptedControl.checked = true;
                        that.toggleAccepted();
                    }
                    Event.removeListener(that.hideAcceptedControl, 'click');
                    Event.addListener(that.hideAcceptedControl, 'click', that.toggleAccepted, that, true);

                    // add users into the select that were found during the rendering
                    that.refreshUserSelect();

                    setStatus();

                }, queryWithParams);
            }
        },

        showEditor: function(item, schema) {

            var editorConfig = {
                props: (showActuals) ? ['Estimate', 'ToDo', 'Actuals', 'Owner', 'State'] : ['Estimate', 'ToDo', 'Owner', 'State'],
                propertyKeyAccessors: {
                    Owner: function(prop) {
                        return prop != null ? prop.LoginName : null;
                    }
                },
                propertyValueAccessors: {
                    Owner: function(prop) {
                        return prop != null ? prop._refObjectName : null;
                    }
                },
                titleAccessor: function(obj) {
                    return obj.FormattedID + '<br/>' + obj.Name;
                },
                onErrorCallback: function() {
                    gridController.display();
                },
                onSaveCallback: function(changes) {
                    gridController.saveChanges(item, changes, 'editor');
                }
            };
            this.editor.display(item, schema, editorConfig);

        },

        getParentRow: function(el) {
            while (el && el.tagName && el.tagName.toUpperCase() != 'TR') {
                el = el.parentNode;
            }
            return el;
        },

        toggleAccepted: function() {
            var i, len, row,
                    hideAcceptedControl = this.hideAcceptedControl || Dom.get('hide_accepted_control'),
                    userSelect = this.userSelect || Dom.get('filter_user_control'),
                    hideAccepted = hideAcceptedControl.checked,
                    workProds = Dom.getElementsByClassName('rally-workprod-accepted');

            RALLY.toolkit.Cookie.add(this.acceptedCookieKey, hideAccepted);

            for (i = 0,len = workProds.length; i < len; i++) {
                row = this.getParentRow(workProds[i]);

                if (hideAccepted) {
                    Dom.addClass(row, 'accepted');
                } else {
                    Dom.removeClass(row, 'accepted');
                }
            }

            if (hideAccepted && this.numItemsVisible() == 0) {
                if (userSelect.selectedIndex >= 0 && userSelect.options[userSelect.selectedIndex].value == this.allOwnersLabel) {
                    RALLY.toolkit.showWarning('The selected iteration contains only accepted stories');
                } else {
                    RALLY.toolkit.showWarning('The selected owner has only accepted stories and/or tasks');
                }
            }
        },

        refreshUserSelect: function() {
            this.userSelect = this.userSelect || Dom.get('filter_user_control');

            var selectedOwner = 0, selectedIndex = -1, options,
                    defaultUsers = [ this.allOwnersLabel, this.noOwnerLabel ],
                    users = this.getOwnersOnTaskboard();

            if (this.userSelect.selectedIndex >= 0) {
                selectedOwner = this.userSelect.options[this.userSelect.selectedIndex].value;
            } else if (RALLY.toolkit.Cookie.get(this.ownerCookieKey)) {
                selectedOwner = RALLY.toolkit.Cookie.get(this.ownerCookieKey);
            }

            // clear out current options
            RALLY.toolkit.HTML.clearSelect(this.userSelect);

            users.sort(function(a, b) {
                return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1;
            });

            options = defaultUsers.concat(users);
            for (i = 0,len = options.length; i < len; i++) {
                this.userSelect.options[this.userSelect.options.length] = new Option(options[i], options[i]);
                if (selectedOwner == options[i]) {
                    selectedIndex = i;
                }
            }
            if (selectedIndex == -1) {
                // if we tried to find an owner that didn't exist, default to 'All'
                selectedIndex = 0;

                if (selectedOwner) {
                    RALLY.toolkit.showWarning('The selected owner ' + selectedOwner + ' does not exist in this view.  Reset the filtering to ' + this.allOwnersLabel);
                }
            }
            this.userSelect.selectedIndex = '' + selectedIndex;
            YAHOO.util.Event.removeListener(this.userSelect, 'change')
            YAHOO.util.Event.addListener(this.userSelect, 'change', this.filterByOwner, this, true);

            RALLY.toolkit.Cookie.add(this.ownerCookieKey, selectedOwner);

            this.filterByOwner();
        },

        saveChanges: function(item, changes, source, successCallback) {
            var that = this, i, len, html = [], error, isConcurrencyError;

            if (!Lang.isValue(source)) {
                source = 'taskboard';
            }

            // set to-do to 0
            if (changes.State == "Completed") {
                changes.ToDo = "0";
            }

            // always include _objectVersion
            if (!changes._objectVersion) {
                changes._objectVersion = item._objectVersion;
            }

            if (this.dataSource) {
                this.dataSource.update(item, changes, function(model) {
                    if (model.OperationResult.Errors.length == 0) {
                        that.refreshItem(item);
                        that.editor.close();
                        if (successCallback) {
                            successCallback();
                        }

                    } else {

                        html.push('<ul>');
                        for (i = 0,len = model.OperationResult.Errors.length; i < len; i++) {
                            error = model.OperationResult.Errors[i];
                            if (error.toLowerCase().indexOf('concurrency conflict') != -1 || error.toLowerCase().indexOf('could not read') != -1) {
                                isConcurrencyError = true;
                            }
                            error = that.parseSaveErrorsIntoReadableString(error);
                            if (error) {
                                html.push('<li>' + error + '</li>');
                            }
                        }
                        html.push('</ul>');

                        if (source == 'editor') {
                            that.editor.displayError(html.join(''), isConcurrencyError);
                        } else {
                            RALLY.toolkit.showWarning('The task you have drag-n-dropped has been modified by another user.<br/>Refreshing task board state.');
                            that.display();
                        }
                    }
                });
            }
        },

        parseSaveErrorsIntoReadableString: function(error) {
            var matches, tmp;

            // what type of error did we get back?
            if (error.toLowerCase().indexOf('concurrency conflict') != -1) {
                error = 'Item was modified by another user';
            } else if (error.toLowerCase().indexOf('could not read') != -1) {
                error = 'Item was deleted by another user';
            } else if (error.toLowerCase().indexOf('could not convert') != -1) {
                // let's try and strip some of the nastyness out of this message
                matches = error.match(/could not convert: (.*)/i);
                if (matches && matches.length > 1) {
                    error = matches[1];
                }
                error = error.replace('double', 'number');
            } else if (error.toLowerCase().indexOf('validation error') != -1) {
                matches = error.match(/validation error: .* ([a-z]+) >= 0 is an invalid numeric/i);
                if (matches && matches.length > 1) {
                    tmp = matches[1].toLowerCase();

                    // ignore these rollup fields
                    if (tmp == 'taskestimatetotal' || tmp == 'taskremainingtotal') {
                        return null;
                    }
                    error = '"' + tmp.substr(0, 1).toUpperCase() + tmp.substr(1) + '" must be non-negative';
                }
            }

            return error;
        },

        deleteItem: function(task) {
            var that = this;

            if (task) {
                this.dataSource.remove(task, function(model) {

                    if (model.OperationResult.Errors.length == 0) {
                        that.view.removeItem(task);

                        if (RALLY.toolkit.insideRally() && parent && parent.RALLY) {
                            parent.RALLY.util.showDeleteFlair({
                                oid: task.ObjectID,
                                record: task,
                                recordName : task.FormattedID + ': ' + task.Name,
                                restorable : true

                            });
                        }
                        that.dataSource.refreshWorkProduct(task.WorkProduct, function(newWorkProduct) {

                            that.view.refreshRowHeader(newWorkProduct);
                            that.refreshUserSelect();
                        });

                    } else {
                        RALLY.toolkit.showError('There was an error deleting the task');

                        // rebuild the task board to get back to a consistent state
                        that.updateIteration();
                    }
                });
            }
        },

        refreshItem: function(item) {
            var that = this;

            if (item) {

                this.dataSource.refreshTask(item, function(model) {
                    that.view.refreshItem(model.items[0].tasks[0]);
                    that.refreshUserSelect();
                    that.view.refreshRowHeader(model.items[0].workProducts[0]);
                });
            }

        },

        getOwnersOnTaskboard: function() {
            var i, len, div, ownerMap = {}, owners = [], items = this.view.findItems();

            for (i = 0,len = items.length; i < len; i++) {
                div = Dom.getElementsByClassName('owner', 'div', items[i])[0];
                if (div && div.innerHTML != this.noOwnerLabel && !Dom.hasClass(div, 'deleted-owner')) {
                    ownerMap[div.innerHTML] = 1;
                }
            }

            for (i in ownerMap) {
                owners.push(RALLY.toolkit.HTML.unescapeXMLEntities(i));
            }

            return owners;
        },

        numItemsVisible: function() {
            var i, len, items, num = 0;
            var comparator = function(el) {
                try {
                    return Dom.hasClass(el, 'rally-task') || Dom.hasClass(el, 'rally-workprod');
                } catch (e) {
                }
                return false;
            };

            items = this.view.findItems(comparator);
            for (i = 0,len = items.length; i < len; i++) {
                if (!(Dom.hasClass(items[i], 'hidden') || Dom.hasClass(this.getParentRow(items[i]), 'accepted') || Dom.hasClass(this.getParentRow(items[i]), 'hidden'))) {
                    num++;
                }
            }
            return num;
        },

        filterByOwner: function() {
            var i, len, that = this, shown = 0, shownAccepted = 0, itemMap = {}, rows = [], items, item,
                    sel = this.userSelect || Dom.get('filter_user_control'),
                    selected = sel.options[sel.selectedIndex];

            RALLY.toolkit.Cookie.add(this.ownerCookieKey, selected.innerHTML);

            var buildComparator = function(owner) {
                return function(item) {
                    try {
                        return owner.innerHTML == that.allOwnersLabel || YAHOO.util.Dom.getElementsByClassName('owner', 'div', item)[0].innerHTML == owner.innerHTML;
                    } catch (e) {
                    }
                    return false;
                };
            };
            var isTask = function(o) {
                return Dom.hasClass(o, 'rally-task');
            };
            var isWorkProd = function(o) {
                return Dom.hasClass(o, 'rally-workprod');
            };
            var isParentVisible = function(el) {
                for (var i = 0, len = rows.length; i < len; i++) {
                    if (rows[i] == el) {
                        return true;
                    }
                }
            };

            items = this.view.findItems(buildComparator(selected));
            for (i = 0,len = items.length; i < len; i++) {
                item = items[i];
                if (isTask(item)) {
                    itemMap[item.id] = 1;
                    rows.push(this.getParentRow(item));
                } else if (isWorkProd(item)) {
                    rows.push(this.getParentRow(item));
                }
            }

            items = this.view.findItems();
            for (i = 0,len = items.length; i < len; i++) {
                item = items[i];

                if (isTask(item)) {
                    if (typeof itemMap[item.id] == 'undefined') {
                        Dom.addClass(item, 'hidden');
                    } else {
                        if (this.hideAcceptedControl.checked && Dom.hasClass(item, 'rally-task-accepted')) {
                            shownAccepted++;
                        } else {
                            shown++;
                        }
                        Dom.removeClass(item, 'hidden');
                    }
                } else if (isWorkProd(item)) {
                    item = this.getParentRow(item);
                    if (isParentVisible(item)) {
                        if (this.hideAcceptedControl.checked && Dom.hasClass(item, 'hidden')) {
                            shownAccepted++;
                        } else {
                            shown++;
                        }
                        Dom.removeClass(item, 'hidden');
                    } else {
                        Dom.addClass(item, 'hidden');
                    }
                }
            }

            if (shown == 0 && shownAccepted > 0) {
                RALLY.toolkit.showWarning('The selected owner has only accepted stories and\/or tasks');
            }
            if ((shown + shownAccepted) == 0) {
                RALLY.toolkit.showWarning('The selected owner does not own any stories or tasks');
            }
        },

        updateIteration: function() {
            var sel = this.iterationSelect,
                    selected = sel.options[sel.selectedIndex];
            RALLY.toolkit.Cookie.add(this.iterationCookieKey, selected.value);
            this.display(selected.value);
        }
    };

    var config = (query.adHocQuery) ? query : { adHocQuery: query };
    config.integrationInfo = {};
    config.integrationInfo.Name = "Mashup: Taskboard";
    config.integrationInfo.Version = "2009.5";
    config.integrationInfo.Vendor = "Rally Software";

    var gridController = new RALLY.toolkit.Controller(config, viewConfig);
    gridController.display();


}

rally.addOnLoad(onLoad);
