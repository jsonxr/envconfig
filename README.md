# envconfig
Store configuration in environment variables with automatic verification. If a test/stage/prod environment has not been configured correctly, the app can be written to fail immediately telling the installer that they need to make sure the environment is valid.

In a locked down read-only environment, this avoids operations teams deploying an app but failing to create a directory that an application needs. It also prevents the app from being deployed to production without overriding a database connection string.

Inspired by http://12factor.net/config

Features:

* Uses an environment variable if it is set.
* Provides a default environment variable if one is not set.
* Checks for required environment variables that have not been set
* Checks for directories that don't exist
* Will create directories if desired
* Converts environment variables from string to appropriate type (number, string, array)

You can pass environment variables in via the command line or they can be set in a script. Here is an example of setting them via the command line:

    NODE_ENV=test UPLOADS=./uploads node example

In the following example, if this is run for the first time, it will fail with an error stating that the path does not exist. It is assumed that environments other than development will be configured with NODE_ENV set to something other than 'development'.


# example
    var envconfig = require('envconfig');
    var env = envconfig({
      NODE_ENV: 'development',
      UPLOADS: {
        required: false,  // If true, checkSync will throw an error if not set
        value: './uploads', // value to use if env not overridden
        isDirectory: true, // If true, checkSync will throw an error if doesn't exist
        description: 'This is the directory where uploaded files are stored.'
      },
      ARR: ['1','2','3'],
      MAX_SIZE_BYTES: 1024 // 1k
    });
    
    if (env.NODE_ENV !== 'development') {
      env.check()
        .fail(function (errors) {
          for (var i = 0; i < errors.length; i++) {
            console.error(errors[i].message);
          }
          process.exit(1);
        });
    } else {
      // Create directories if they don't exist to make life easier
      env.createDirectories()
        .fail(function (err) {
          console.error(err);
          process.exit(1);
        });
    }
    
    console.log('Uploads path: ' + env.UPLOADS);
    console.log('Max filesize (bytes): ' + env.MAX_SIZE_BYTES);
    console.log('element 0 for ARR: ' + env.ARR[0]);

