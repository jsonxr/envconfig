var fs = require('fs');
var path = require('path');
var async = require('async');
var Q = require('q');

function wordwrap( str, width, brk, cut ) {

  brk = brk || '\n';
  width = width || 75;
  cut = cut || false;

  if (!str) { return str; }

  var regex = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');

  return str.match( new RegExp(regex, 'g') ).join( brk );

}

function forEachKey(obj, fn) {
  var key, value;

  if (obj) {
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        value = obj[key];
        fn(key, value);
      }
    }
  }
}

function parseBool(value) {
  if (value === undefined) { return false; }
  var str = value.toString().toLowerCase();
  return ('true' === str || 'yes' === str)
}

function shellScriptWrap(value) {
  if (value.value) { value = value.value };
  if (typeof value === 'string') {
    return '\'' + value + '\''
  } else if( Object.prototype.toString.call(value) === '[object Array]' ) {
    return '\'' + value.join(",") + '\''
  } else {
    return value
  }
}

function Environment(defaults) {
  var me = Object.create(Environment);
  me.defaults = defaults;

  // Chec the process.env for overrides
  forEachKey(defaults, function (key, variable) {
    var value = (variable.value !== undefined) ? variable.value : variable;
    var defaultValue = value;
    var type = typeof value;
    
    if (process.env[key] !== undefined) {
      me[key] = fromString(type, defaultValue, process.env[key]);
    } else {
      me[key] = defaultValue;
    }
  });


  me.getDirectories = function (callback) {
    var directories = [];
    var deferred = Q.defer();

    function collect(key, cb) {
      var value = me.defaults[key];
      var isDirectory = value.isDirectory;
      if (isDirectory) {
        var dir = {
          value: me[key],
          exists: false
        };

        fs.lstat(dir.value, function (err, stat) {
          if (stat) {
            dir.exists = true;
          }
          directories[key] = dir;
          cb();
        });
      } else {
        cb();
      }
    }

    async.each(Object.keys(me.defaults), collect, function (err) {
      // If using as a callback, then call it!
      if (callback) {
        callback(directories);
      }
      // Resolve promise
      deferred.resolve(directories);
    })

    return deferred.promise;
  }


  me.getVariables = function () {
    var variables = {};
    forEachKey(me.defaults, function (key, value) {
      var variable = {
        value: me[key],
        required: value.required,
        exists: process.env[key] !== undefined
      }
      variables[key] = variable;
    })

    return variables;
  }

  me.createDirectories = function (callback) {
    var deferred = Q.defer();

    function createDir(dir, cb) {
      if (! dir.exists) {
        fs.mkdir(dir.value, function (err) {
          cb(err);
        });
      } else {
        cb();
      }
    }

    me.getDirectories(function (directories) {
      var keys = Object.keys(directories);
      var dirs = keys.map(function(v) { return directories[v]; });

      async.eachSeries(dirs, createDir, function (err) {
        // If using as a callback, then call it!
        if (callback) {
          callback(err);
        }
        // Resolve promise
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      })
    });

    return deferred.promise;
  }

  me.check = function (options, callback) {
    var errors = null;
    var deferred = Q.defer();

    if (options === undefined) {
      callback = null;
      options = {};
    } else if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    function error(name, msg) {
      errors = errors || [];
      var e = new Error(msg);
      e.name = name;
      errors.push(e);
    }

    var variables = null;
    // Check all variables are set
    variables = me.getVariables();
    forEachKey(variables, function (key, variable) {
      if (variable.required && !variable.exists) {
        error('EnvironmentRequiredError', 'Variable is required: '+key);
      }
    })

    // Make sure directories exist
    me.getDirectories(function (directories) {
      forEachKey(directories, function (key, dir) {
        if (! dir.exists) {
          error('EnvironmentDirectoryError', 'Path does not exist: '+key+'="' + path.resolve(dir.value) + '"');
        }
      })

      // Set the name of the errors object
      if (errors) {
        errors.name = 'EnvironmentErrors';
      }
      
      // If callback, call it
      if (callback) {
        callback(errors);
      }
      // do the promise
      if (! errors) {
        deferred.resolve();
      } else {
        deferred.reject(errors);
      }
    });

    return deferred.promise;
  }


  return me;
}

function fromString(type, defaultValue, str) {
    if (type === 'number') {
      return parseFloat(str)
    } else if (type === 'boolean') {
      return parseBool(str);
    } else if( Object.prototype.toString.call(defaultValue) === '[object Array]' ) {
      // Array
      var arr = str.split(',');
      for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].trim();
      }
      return arr;
    } else {
      return str;
    }
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = Environment;
