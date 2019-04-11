'use strict'
const request = require('request')

exports.getSession = (callback) => {
    var options = {
        uri : 'http://localhost:3000/api/users',
        method : 'POST'
    }
    request(options, function (error, response, body) {
        return callback(response);
    });
}
