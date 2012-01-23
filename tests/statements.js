/* Global equal, responseText, statement, ok, deepEqual, QUnit, module, asyncTest, Util, start */
/*jslint devel: true, browser: true, sloppy: false, maxerr: 50, indent: 4 */
var statementsEnv = {};

module('Statements', {
	setup: function () {
		"use strict";
		Util.init(statementsEnv);
	}
});


asyncTest('empty statement PUT', function () {
	// empty statement should fail w/o crashing the LRS (error response shoudl be received)
	"use strict";
	statementsEnv.util.request('PUT', '/statements?statementId=' + statementsEnv.id, null, true, 400, 'Bad Request', start);
});

asyncTest('empty statement POST', function () {
	// empty statement should fail w/o crashing the LRS (error response shoudl be received)
	"use strict";
	statementsEnv.util.request('POST', '/statements/', null, true, 400, 'Bad Request', start);
});

asyncTest('PUT / GET', function () {
	"use strict";
	var env = statementsEnv,
		url = '/statements?statementId=' + env.id;

	env.util.request('PUT', url, JSON.stringify(env.statement), true, 204, 'No Content', function () {
		env.util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			env.util.validateStatement(xhr.responseText, env.statement, env.id);
			start();
		});
	});
});

asyncTest('POST /w ID', function () {
	"use strict";
	var env = statementsEnv,
		url = '/statements?statementId=' + env.id;

	env.util.request('POST', url, JSON.stringify(env.util.golfStatements), true, 405, 'Method Not Allowed', function () {
		start();
	});
});


asyncTest('Authentication', function () {
	"use strict";
	var env = statementsEnv,
		url = '/statements?statementId=' + env.id,
		util = env.util;


	util.request('PUT', url, JSON.stringify(env.statement), false, 401, 'Unauthorized', function () {
		util.request('GET', url, null, false, 401, 'Unauthorized', function () {
			start();
		});
	});
});

asyncTest('Reject Statement Modification', function () {
	"use strict";

	var env = statementsEnv,
		util = env.util,
		id = util.ruuid(),
		url = '/statements?statementId=' + id;

	util.request('PUT', url, JSON.stringify(env.statement), true, 204, 'No Content', function () {
		util.request('PUT', url, JSON.stringify(env.statement).replace('experienced', 'passed'), true, 409, 'Conflict', function () {
			util.request('GET', url, null, true, 200, 'OK', function (xhr) {
				util.validateStatement(xhr.responseText, env.statement, id);
				start();
			});
		});
	});
});

asyncTest('PUT / GET w/ Extensions', function() {
    var env = statementsEnv;
    var myStatementId = env.util.ruuid();
    var url = '/statements?statementId=' + myStatementId;
    var myRegId = env.util.ruuid();
    var myStatement = {
        id: myStatementId,
        actor: env.statement.actor,
        verb: "passed",
        object: env.statement.object,
        context: {
            registration: myRegId,
            extensions: {
                ctx_extension_1: 1234
            }
        },
        result: {
            score: { scaled: 87.0 },
            success: true,
            completion: true,
            extensions: {
                extension_1: "some value"
            }
        }
    };

	env.util.request('PUT', url, JSON.stringify(myStatement), true, 204, 'No Content', function () {
		env.util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			env.util.validateStatement(xhr.responseText, myStatement, myStatementId);
			start();
		});
	});
        
});

asyncTest('PUT / GET w/ Revision and Platform', function() {
    var env = statementsEnv;
    var myStatementId = env.util.ruuid();
    var url = '/statements?statementId=' + myStatementId;
    var myRegId = env.util.ruuid();
    var myStatement = {
        id: myStatementId,
        actor: env.statement.actor,
        verb: "experienced",
        object: env.statement.object,
        context: {
            registration: myRegId,
            revision:"3",
            platform:"iOS"
        },
    };

	env.util.request('PUT', url, JSON.stringify(myStatement), true, 204, 'No Content', function () {
		env.util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			env.util.validateStatement(xhr.responseText, myStatement, myStatementId);
			start();
		});
	});
});

asyncTest('PUT / GET Actor as Object', function() {
    var env = statementsEnv;
    var myStatementId = env.util.ruuid();
    var url = '/statements?statementId=' + myStatementId;
    var myStatement = {
        id: myStatementId,
        verb: "imported",
        object: env.statement.actor
    };

	env.util.request('PUT', url, JSON.stringify(myStatement), true, 204, 'No Content', function () {
		env.util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			env.util.validateStatement(xhr.responseText, myStatement, myStatementId);
			start();
		});
	});
        
});

asyncTest('Reject Actor Modification', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		otherId = util.ruuid(),
		url = '/statements?statementId=',
		modLearnerName = 'Renamed Auto Test Learner';

	util.request('PUT', url + util.ruuid(), JSON.stringify(env.statement), true, null, null, function () {
		util.request('PUT', url + otherId, JSON.stringify(env.statement).replace(env.statement.actor.name, modLearnerName), true, 204, 'No Content', function () {
			util.request('GET', url + otherId, null, true, 200, 'OK', function (xhr) {
				var response;
				response = util.tryJSONParse(xhr.responseText);

				// verify statement is returned with modified name, but then undo modification for checking the rest of the statement
				equal(response.actor.name, modLearnerName);
				response.actor.name = env.statement.actor.name;
				util.validateStatement(JSON.stringify(response), env.statement, otherId);

				util.request('GET', '/actors?actor=<actor>', null, true, 200, 'OK', function (xhr) {
					equal(util.tryJSONParse(xhr.responseText).name, env.statement.actor.name, 'Actor should not have been renamed based on statement.');
					start();
				});
			});
		});
	});
});

asyncTest('Bad Verb', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements?statementId=' + util.ruuid(),
		statement = util.clone(env.statement);

	statement.verb = 'not a valid verb';
	util.request('PUT', url, JSON.stringify(statement), true, 400, 'Bad Request', function (xhr) {
		// should return an error message, can't validatate content, but make sure it's there
		ok(xhr.responseText !== null && xhr.responseText.length > 0, "Message returned");
		util.request('GET', url, null, true, 404, 'Not Found', function () {
			start();
		});
	});
});

asyncTest('Bad ID', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements?statementId=' + encodeURIComponent(util.ruuid() + 'bad_id'),
		statement = util.clone(env.statement);

	util.request('PUT', url, JSON.stringify(statement), true, 400, 'Bad Request', function (xhr) {
		// should return an error message, can't validatate content, but make sure it's there
		ok(xhr.responseText !== null && xhr.responseText.length > 0, "Message returned");
		util.request('GET', url, null, true, 400, 'Bad Request', function () {
			start();
		});
	});
});

asyncTest('pass special handling', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements?statementId=' + util.ruuid(),
		statement = util.clone(env.statement);

	statement.verb = 'passed';

	util.request('PUT', url, JSON.stringify(statement), true, 204, 'No Content', function () {
		util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			var response = JSON.parse(xhr.responseText);
			equal(response.verb, 'passed', 'verb');
			equal(response.result.success, true, 'success');
			equal(response.result.completion, true, 'completion');
			start();
		});
	});
});

asyncTest('fail special handling', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements?statementId=' + util.ruuid(),
		statement = util.clone(env.statement);

	statement.verb = 'failed';

	util.request('PUT', url, JSON.stringify(statement), true, 204, 'No Content', function () {
		util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			var response = JSON.parse(xhr.responseText);
			equal(response.verb, 'failed', 'verb');
			equal(response.result.success, false, 'success');
			equal(response.result.completion, true, 'completion');
			start();
		});
	});
});

asyncTest('completed special handling', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements?statementId=' + util.ruuid(),
		statement = util.clone(env.statement);

	statement.verb = 'completed';

	util.request('PUT', url, JSON.stringify(statement), true, 204, 'No Content', function () {
		util.request('GET', url, null, true, 200, 'OK', function (xhr) {
			var response = JSON.parse(xhr.responseText);
			equal(response.verb, 'completed', 'verb');
			equal(response.result.completion, true, 'completion');
			start();
		});
	});
});

asyncTest('POST multiple', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements/',
		golfStatements = util.golfStatements;

	util.request('POST', url, JSON.stringify(golfStatements), true, 200, 'OK', function (xhr) {
		var ids = JSON.parse(xhr.responseText),
			object,
			ii,
			testId = ids[ids.length - 5]; // first few statements aren't good examples, grab a later one

		for (ii = 0; ii < golfStatements.length; ii++) {
			if (golfStatements[ii].id === testId) {
				object = encodeURIComponent(JSON.stringify(golfStatements[ii].object, null, 4));

				env.util.request('GET', url + '?limit=5&sparse=false&object=' + object, null, true, 200, 'OK', function (xhr) {
					var results = util.tryJSONParse(xhr.responseText),
						jj;
					for (jj = 0; jj < results.length; jj++) {
						if (results[jj].id === golfStatements[ii].id) {
							delete results[jj].object.definition;
							env.util.validateStatement(results[jj], golfStatements[ii], testId);
							start();
							return;
						}
					}

					ok(false, 'Returned statement ID "' + testId + '" not found.');
					start();
				});
				return;
			}
		}
		ok(false, 'Returned statement ID "' + testId + '" not found.');
		start();
		return;
	});
});

asyncTest('GET statements', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements/';


	util.request('GET', url + '?limit=1', null, true, 200, 'OK', function (xhr) {
		var result = util.tryJSONParse(xhr.responseText);
		console.log(JSON.stringify(result, null, 4));
		equal(result.length, 1, 'GET limit 1');
		ok(result[0].verb !== undefined, 'statement has verb (is a statement)');
		start();
	});
});

asyncTest('GET statements (via POST)', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements/';


	util.request('POST', url, 'limit=1', true, 200, 'OK', function (xhr) {
		var result = util.tryJSONParse(xhr.responseText);
		console.log(JSON.stringify(result, null, 4));
		equal(result.length, 1, 'POST limit 1');
		ok(result[0].verb !== undefined, 'statement has verb (is a statement)');
		start();
	});
});


asyncTest('GET statements (via POST), all filters', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements/';


    var actorParam = encodeURIComponent(JSON.stringify(env.statement.actor));

	util.request('POST', url, 'limit=10&actor='+actorParam, true, 200, 'OK', function (xhr) {
		var statements = util.tryJSONParse(xhr.responseText),
			statement,
			filters = {},
			prop,
			queryString = [];

		if (statements.length === 10) {
			// pick a statement with statements stored before & after
			statement = statements[5];

			// add filters which match the selected statement
			filters.since = util.ISODateString(new Date(new Date(statement.stored).getTime() - 1));
			filters.until = statement.stored;
			filters.verb = statement.verb;
			filters.object = JSON.stringify(statement.object, null, 4);
			if (statement.context !== undefined && statement.context.registration !== undefined) {
				filters.registration = statement.context.registration;
			}
			filters.actor = JSON.stringify(env.statement.actor, null, 4);

			for (prop in filters) {
				if (filters.hasOwnProperty(prop)) {
					queryString.push(prop + '=' + encodeURIComponent(filters[prop]));
				}
			}

			util.request('POST', url, queryString.join('&'), true, 200, 'OK', function (xhr) {
				var results = util.tryJSONParse(xhr.responseText),
					ii,
					found = false;

				for (ii = 0; ii < results.length; ii++) {
					if (results[ii].id === statement.id) {
						found = true;
					}
					equal(results[ii].stored, statement.stored, 'stored');
					equal(results[ii].verb, statement.verb, 'verb');
					if (statement.object.id !== undefined) {
						// object is an activity
						equal(results[ii].object.id, statement.object.id, 'object');
					} else {
						// object is an actor
						ok(util.areActorsEqual(results[ii].object, statement.object), 'object');
					}
					if (statement.context !== undefined && statement.context.registration !== undefined) {
						equal(results[ii].context.registration, statement.context.registration, 'registration');
					}
					// actor comparison
					ok(util.areActorsEqual(results[ii].actor, statement.actor), 'actor');
				}
				ok(found, 'find statement filters based on');
				start();
			});
		} else {
			ok(false, 'Test requires at least 10 existing statements');
			start();
		}
	});
});

function getGolfStatement(id) {
	"use strict";
	var ii, util = statementsEnv.util;

	for (ii = 0; ii < util.golfStatements.length; ii++) {
		if (util.golfStatements[ii].object.id === id && util.golfStatements[ii].verb != "imported") {
			return util.golfStatements[ii];
		}
	}
	return null;
}

function verifyGolfDescendants(callback) {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements/',
		testActivity = { id : 'scorm.com/GolfExample_TCAPI' };

	util.request('GET', url + '?verb=imported&limit=1&object=' + encodeURIComponent(JSON.stringify(testActivity)), null, true, null, null, function (xhr) {
		if (xhr.status !== 200) {
			util.request('POST', url, JSON.stringify(getGolfStatement(testActivity.id), null, 4), true, 200, 'OK', function () {
				callback();
			});
		}
	});
}

asyncTest('Statements, context activities filter', function () {
	"use strict";
	var env = statementsEnv;
	var util = env.util;
	var url = '/statements';

	var testActivity = { id: 'com.scorm.golfsamples.interactions.playing_1'};

	var groupingId = 'scorm.com/GolfExample_TCAPI';
	var groupingFilter = encodeURIComponent(JSON.stringify({id : groupingId}));

    var parentId = 'scorm.com/GolfExample_TCAPI/GolfAssessment.html';
    var parentFilter = encodeURIComponent(JSON.stringify({id : parentId}));

    var otherId = "com.scorm.golfsamples.context_other";
    var otherFilter = encodeURIComponent(JSON.stringify({id : otherId}));

	// add statement to find
	var statement = util.clone(getGolfStatement(testActivity.id));
	statement.id = util.ruuid();
	statement.context.registration = statement.id;


    async.waterfall([
        function(cb){
            //Post all the golf statements (which include grouping and parent context activities)
	        util.request('POST', url, JSON.stringify(golfStatements), true, 200, 'OK', function(){cb(null);});
        },
        function(cb){
            //Put this extra, specific statement that we'll be looking for...
	        util.request('PUT', url + "?statementId=" + statement.id, JSON.stringify(statement, null, 4), true, 
                         204, 'No Content', function(){cb(null);});
        },
        function(cb){
            //Try to find statements on grouping activity, without context flag, should not be found...
            var thisUrl = url + '?registration=' + statement.context.registration + '&object=' + groupingFilter;
	    	util.request('GET', thisUrl, null, true, 200, 'OK', 
                 function (xhr) {
	    		    equal(JSON.parse(xhr.responseText).length, 0, 'response, find by context, no context flag');
                    cb(null);
                 });
        },
        function(cb){
            //Now look for statements w/ grouping activity and context flag
            var thisUrl = url + '?registration=' + statement.context.registration + '&context=true&object=' + groupingFilter;
	   	    util.request('GET', thisUrl, null, true, 200, 'OK', 
                function (xhr) {
	    			var resultStatements = util.tryJSONParse(xhr.responseText),
	    				resultStatement = resultStatements[0];
	    			if (resultStatement === undefined) {
	    				ok(false, 'statement not found using context filter (grouping activity)');
	    			} else {
	    				equal(resultStatement.id, statement.id, 'correct statement found using context filter (grouping activity)');
	    			}
                    cb(null);
                });
        },
        function(cb){
            //Now look for statements w/ parent activity and context flag
            var thisUrl = url + '?registration=' + statement.context.registration + '&context=true&object=' + parentFilter;
	   	    util.request('GET', thisUrl, null, true, 200, 'OK', 
                function (xhr) {
	    			var resultStatements = util.tryJSONParse(xhr.responseText),
	    				resultStatement = resultStatements[0];
	    			if (resultStatement === undefined) {
	    				ok(false, 'statement not found using context filter (parent activity)');
	    			} else {
	    				equal(resultStatement.id, statement.id, 'correct statement found using context filter (parent activity)');
	    			}
                    cb(null);
                });
        },
        function(cb){
            //Now look for statements w/ "other" activity and context flag
            var thisUrl = url + '?registration=' + statement.context.registration + '&context=true&object=' + otherFilter;
	   	    util.request('GET', thisUrl, null, true, 200, 'OK', 
                function (xhr) {
	    			var resultStatements = util.tryJSONParse(xhr.responseText),
	    				resultStatement = resultStatements[0];
	    			if (resultStatement === undefined) {
	    				ok(false, 'statement not found using context filter (other activity)');
	    			} else {
	    				equal(resultStatement.id, statement.id, 'correct statement found using context filter (other activity)');
	    			}
                    cb(null);
                });
        },
        //Start the next test
        start,
    ]);
});


/*asyncTest('Statements, descendants filter', function () {
	"use strict";
	var env = statementsEnv,
		util = env.util,
		url = '/statements',
		statement,
		testActivity = { id: 'com.scorm.golfsamples.interactions.playing_1'},
		ancestorId = 'scorm.com/GolfExample_TCAPI',
		ancestorFilter = encodeURIComponent(JSON.stringify({id : ancestorId}));

	// add statement to find
	statement = util.clone(getGolfStatement(testActivity.id));
	statement.id = util.ruuid();
	statement.context.registration = statement.id;

	//?limit=1&activity=' + encodeURIComponent(JSON.stringify(testActivity))
	// statement not found by ancestor w/o using 'descendant' flag
	util.request('POST', url, JSON.stringify(golfStatements), true, 200, 'OK', function (xhr) {
	    util.request('PUT', url + "?statementId=" + statement.id, JSON.stringify(statement, null, 4), true, 204, 'No Content', function () {
	    	util.request('GET', url + '?registration=' + statement.context.registration + '&object=' + ancestorFilter, null, true, 200, 'OK', function (xhr) {
	    		equal(JSON.parse(xhr.responseText).length, 0, 'response, find by ancestor no descendants flag');
	    		util.request('GET', url + '?registration=' + statement.context.registration + '&descendants=true&object=' + ancestorFilter, null, true, 200, 'OK', function (xhr) {
	    			var resultStatements = util.tryJSONParse(xhr.responseText),
	    				resultStatement = resultStatements[0];
	    			if (resultStatement === undefined) {
	    				ok(false, 'statement not found using descendant filter');
	    			} else {
	    				equal(resultStatement.id, statement.id, 'correct statement found using descendant filter');
	    			}
	    			start();
	    		});
	    	});
	    });
    });

	/*util.request('POST', url, 'limit=10', true, 200, 'OK', function (xhr) {
		var statements = util.tryJSONParse(xhr.responseText),
			statement,
			filters = {},
			prop,
			queryString = [];

		if (statements.length === 10) {
			// pick a statement with statements stored before & after
			statement = statements[5];

			// add filters which match the selected statement
			filters.since = (new Date(new Date(statement.stored).getTime() - 1)).toString();
			filters.until = statement.stored;
			filters.verb = statement.verb;
			filters.object = JSON.stringify(statement.object, null, 4);
			if (statement.registration !== undefined) {
				filters.registration = statement.registraiton;
			}
			filters.actor = JSON.stringify(statement.actor, null, 4);

			for (prop in filters) {
				if (filters.hasOwnProperty(prop)) {
					queryString.push(prop + '=' + encodeURIComponent(filters[prop]));
				}
			}

			util.request('GET', url + statement.id, null, true, 200, 'OK', function (xhr) {
				var results = util.tryJSONParse(xhr.responseText),
					ii,
					found = false;

				results = [results];

				for (ii = 0; ii < results.length; ii++) {
					if (results[ii].id === statement.id) {
						found = true;
					}
					equal(results[ii].stored, statement.stored, 'stored');
					equal(results[ii].verb, statement.verb, 'verb');
					if (statement.object.id !== undefined) {
						// object is an activity
						equal(results[ii].object.id, statement.object.id, 'object');
					} else {
						// object is an actor
						ok(util.areActorsEqual(results[ii].object, statement.object), 'object');
					}
					if (statement.registration !== undefined) {
						equal(results[ii].registration, statement.registration, 'registration');
					}
					// actor comparison
					ok(util.areActorsEqual(results[ii].actor, statement.actor), 'actor');
				}
				ok(found, 'find statement filters based on');
				start();
			});
		} else {
			ok(false, 'Test requires at least 10 existing statements');
			start();
		}
	});*/
/*});*/
