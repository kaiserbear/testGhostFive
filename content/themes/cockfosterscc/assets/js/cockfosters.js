function cockfosterscc() {
    console.log('Welcome to Cockfosters Cricket Club');
}

function getPlayCricketFixtures() {

    $.getJSON("/match-results/", function(data) {
        // var items = [];
        console.log(data);
        // $.each(data, function(key, val) {
        //     items.push("<li id='" + key + "'>" + val + "</li>");
        // });

        // $("<ul/>", {
        //     "class": "my-new-list",
        //     html: items.join("")
        // }).appendTo("#matches");
    });
}

cockfosterscc();

getPlayCricketFixtures();