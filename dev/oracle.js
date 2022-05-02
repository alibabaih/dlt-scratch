const ORACLE_URI = "http://localhost:4000/weather";

class Oracle {

    constructor() { }

}

Oracle.prototype.getConditions = function() {
    fetch(ORACLE_URI).then(
        function(response) {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + response.status);
                return;
            }
            response.json().then(function(data) {
                console.log(data);
                return data;
            });
        }
    ).catch(function(err) {
        console.log('Fetch Error :-S', err);
    });
};

module.exports = Oracle;