var http = require('http');
var token = process.env['OPEN_DATA_API_KEY'];

var rp = require('request-promise');

var ruleProcessor = require('./../helpers/ruleProcessor');
var addressResolver = require('./../helpers/addressResolver');

function search(req, res) {
    getAddress(req.query.lat, req.query.long).then(function (address) {
        if (address.success) {
            console.log(address);
            findRules(address.data.name).then(function (data) {
                findingReport = ruleProcessor.process(address.data.number, data);
                res.send(findingReport);
            }).catch(function(error){
                res.send(error);
            });
        } else {
            res.send({ success: false, message: "Unable to resolve address" });
        }
    });

}

function findRules(street) {
    var options = {
        url: 'https://data.baltimorecity.gov/resource/fxmk-qkxu.json',
        headers: {
            'User-Agent': 'request'
        },
        qs: {
            '$limit': 20,
            '$$app_token': token,
            'streetname': street + ' ' //open data has an extra space after all the streets??
        }
    };
    return rp(options)
}

function getAddress(lat, long) {
    return addressResolver.resolve(lat, long).then(function (response) {
        return { success: true, data: parseStreet(response) };
    }).catch(function (error) {
        return { success: false, error: error };
    });
}

function parseStreet(data) {
    data = JSON.parse(data);
    streetNumber = data.results[0].address_components[0].long_name;
    streetName = data.results[0].address_components[1].short_name;
    streetNumber = averageBlock(streetNumber);
    streetName = removeRoadType(streetName);
    streetName = isDirectionIncluded(streetName);
    return { name: streetName, number: streetNumber };
}

function removeRoadType(st){
    pieces = streetName.split(' ');
    pieces.pop();
    return pieces.join(' ');
}

function averageBlock(blockArea){
    if(blockArea.indexOf('-') > -1){
        pieces = blockArea.split('-');
        return pieces[0];
    }
    return blockArea;
}

function isDirectionIncluded(streetName){
    pieces = streetName.split(' ');
    if(pieces[0] === 'E' || pieces[0] === 'N' || pieces[0] === 'W' || pieces[0]==='S'){
        pieces.shift(); //Remove the direction, we just want street name
        return pieces.join(' ');
    }else{
        return streetName; //just return unmodified street
    }
}

module.exports.search = search;