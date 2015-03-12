// tests/logger-spec.js
var assert = require('assert');
var fs = require('fs');

var tmp = require('tmp');

var Environment = require('../environment');

describe('environment', function () {

  it('should return defaults if nothing is passed on command line', function (done) {
    var env = Environment({
      NODE_ENV: 'development',
      MY_BOOL: true,
      MY_FLOAT: 1.0,
      MY_ARRAY: ['a','b','c']
    });
    assert.equal(env.NODE_ENV, 'development');
    assert.equal(env.MY_BOOL, true);
    assert.equal(env.MY_FLOAT, 1.0);
    assert.equal(env.MY_ARRAY[0], 'a');
    assert.equal(env.MY_ARRAY[1], 'b');
    assert.equal(env.MY_ARRAY[2], 'c');
    done();
  })
  
  it('should convert string values to the type in the defaults', function (done) {
    process.env.MY_BOOL_TRUE = 'true';
    process.env.MY_BOOL_FALSE = 'false';
    process.env.MY_BOOL_YES = 'yes';
    process.env.MY_FLOAT = '1.2'
    process.env.MY_INT = '2'
    process.env.MY_ARR = 'a, b, c'
    var env = Environment({
      MY_BOOL_TRUE: true,
      MY_BOOL_FALSE: false ,
      MY_BOOL_YES: true ,
      MY_FLOAT: 1.2,
      MY_INT: 2,
      MY_ARR: ['a','b','c']
    });
    assert.strictEqual(env.MY_BOOL_TRUE, true);
    assert.strictEqual(env.MY_BOOL_FALSE, false);
    assert.strictEqual(env.MY_BOOL_YES, true);
    assert.strictEqual(env.MY_FLOAT, 1.2);
    assert.strictEqual(env.MY_INT, 2);
    assert.deepEqual(env.MY_ARR, ['a','b','c']);
    done();
  })
  
  it('should override variables from the environment', function (done) {
    process.env['MY_STRING'] = 'override';
    var env = Environment({
      MY_STRING: 'original',
      MY_STRING2: 'original'
    });
    assert.equal(env.MY_STRING, 'override');
    assert.equal(env.MY_STRING2, 'original');
    done();
  });
  
  it('should accept complex environment variables', function (done) {
    var env = Environment({
      MY_BOOL_TRUE: { value: true },
      MY_BOOL_FALSE: { value: false },
      MY_BOOL_YES: { value: true },
      MY_FLOAT: { value: 1.2 },
      MY_INT: { value: 2 },
      MY_ARR: { value: ['a','b','c'] }
    });
    assert.strictEqual(env.MY_BOOL_TRUE, true);
    assert.strictEqual(env.MY_BOOL_FALSE, false);
    assert.strictEqual(env.MY_BOOL_YES, true);
    assert.strictEqual(env.MY_FLOAT, 1.2);
    assert.strictEqual(env.MY_INT, 2);
    assert.deepEqual(env.MY_ARR, ['a','b','c']);
    done();
  })
  
  it('should return a list of directories in the environment file using a callback', function (done) {
    var env = Environment({
      MY_DIR: {
        value: './non-existent', // Should be returned
        isDirectory: true
      },
      MY_DIR2: {
        value: '.', // Current directory exists, so shouldn't show up
        isDirectory: true
      }
    });
    env.getDirectories(function (directories) {
      assert(directories);
      assert.equal(directories.MY_DIR.exists, false);
      assert.equal(directories.MY_DIR2.exists, true);
      done();
    });
  })
  
  it('should return a list of directories in the environment file using a promise', function (done) {
    var env = Environment({
      MY_DIR: {
        value: './non-existent', // Should be returned
        isDirectory: true
      },
      MY_DIR2: {
        value: '.', // Current directory exists, so shouldn't show up
        isDirectory: true
      }
    });
    env.getDirectories()
      .then(function (directories) {
        assert(directories);
        assert.equal(directories.MY_DIR.exists, false);
        assert.equal(directories.MY_DIR2.exists, true);
        done();
      });
  })
    
  it('should create directories if they don\'t exist using a callback', function (done) {
    var name = tmp.tmpNameSync();
    var env = Environment({
      NODE_ENV: { value: 'development' },
      MY_DIR: {
        value: name,
        isDirectory: true
      }
    });
    // Make sure directory doesn't already exist
    assert.throws(function () {
      fs.statSync(name);
    });
    env.createDirectories(function (err) {
      assert.doesNotThrow(function () {
        fs.statSync(name);
        fs.rmdirSync(name);
      });
      done();
    });
  })
    
  it('should create directories if they don\'t exist using a promise', function (done) {
    var name = tmp.tmpNameSync();
    var env = Environment({
      NODE_ENV: { value: 'development' },
      MY_DIR: {
        value: name,
        isDirectory: true
      }
    });
    // Make sure directory doesn't already exist
    assert.throws(function () {
      fs.statSync(name);
    });
    env.createDirectories()
      .then(function () {
        assert.doesNotThrow(function () {
          fs.statSync(name);
          fs.rmdirSync(name);
        });
        done();
      });
  })
    
  it('should return error if create directories encounters an invalid directory', function (done) {
    var name = '\0'
    var env = Environment({
      NODE_ENV: { value: 'development' },
      MY_DIR: {
        value: name,
        isDirectory: true
      },
      MY_DIR2: {
        value: name,
        isDirectory: true
      }
    });
    // Make sure directory doesn't already exist
    env.createDirectories(function (err) {
      assert(err);
      done();
    });
  })
    
  it('should return errors if check detects errors in the environment using a callback', function (done) {
    var env = Environment({
      MY_DIR: {
        value: './non-existent', // Should be returned
        isDirectory: true
      },
      MY_DIR2: {
        value: '.', // Current directory exists, so shouldn't show up
        isDirectory: true
      }
    });
    env.check(function (errors) {
      assert.equal(errors.name, 'EnvironmentErrors');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].name, 'EnvironmentDirectoryError');
      done();
    });
  })
  
  it('should return errors if check detects errors in the environment using a promise', function (done) {
    var env = Environment({
      MY_DIR: {
        value: './non-existent', // Should be returned
        isDirectory: true
      },
      MY_DIR2: {
        value: '.', // Current directory exists, so shouldn't show up
        isDirectory: true
      }
    });
    env.check()
      .fail(function (errors) {
        assert.equal(errors.name, 'EnvironmentErrors');
        assert.equal(errors.length, 1);
        assert.equal(errors[0].name, 'EnvironmentDirectoryError');
        done();
      });
  })
  
  
  it('should return error if a directory variable does not exist on filesystem', function (done) {
    var env = Environment({
      MY_DIR: {
        value: './non-existent', // Should be returned
        isDirectory: true
      },
      MY_DIR2: {
        value: '.', // Current directory exists, so shouldn't show up
        isDirectory: true
      },
      MY_DIR3: {
        value: '.',
        type: 'directory'
      }
    });
    
    env.check(function (errors) {
      assert.equal(errors.name, 'EnvironmentErrors');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].name, 'EnvironmentDirectoryError');
      done();
    })
    
  })
  
  it('should throw error if a value is required but not supplied', function (done) {
    var env = Environment({
      MY_VAR1: {
        required: true,
        value: 'default'
      },
      MY_VAR2: {
        required: false,
        value: 'default'
      }
    });
    
    env.check(function (errors) {
      assert.equal(errors.name, 'EnvironmentErrors')
      assert.equal(errors.length, 1)
      assert.equal(errors[0].name, 'EnvironmentRequiredError')
      done();
    })
  })  
  
  
});
