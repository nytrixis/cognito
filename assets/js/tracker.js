(function () {
    function generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    if (typeof window.cognitoSessionId === 'undefined') {
        window.cognitoSessionId = generateSessionId();
    }

    var postId = typeof cognitoPostId !== 'undefined' ? cognitoPostId : null;
    if (!postId) return;

    var events = [];
    var lastScroll = 0;
    var maxScroll = 0;
    var startTime = Date.now();
    var lastMouseMove = Date.now();
    var mouseMoves = 0;

    // Track scroll depth
    window.addEventListener('scroll', function () {
        var scrollTop = window.scrollY || window.pageYOffset;
        var docHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        var winHeight = window.innerHeight;
        var percent = Math.round(((scrollTop + winHeight) / docHeight) * 100);
        if (percent > maxScroll) maxScroll = percent;
        events.push({
            type: 'scroll',
            data: { percent: percent, maxScroll: maxScroll, timestamp: Date.now() }
        });
    });

    window.addEventListener('mousemove', function () {
        mouseMoves++;
        lastMouseMove = Date.now();
    });

    function sendEngagementData() {
        var now = Date.now();
        var timeOnPage = Math.round((now - startTime) / 1000);
        var idle = (now - lastMouseMove > 10000); 
        if (events.length === 0) {
            events.push({ type: 'heartbeat', data: { timeOnPage: timeOnPage, idle: idle, mouseMoves: mouseMoves } });
        }

        var payload = {
            session_id: window.cognitoSessionId,
            post_id: postId,
            page_url: window.location.href,
            events: events.splice(0, events.length)
        };

        fetch('/wordpress/wp-json/cognito/v1/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (res) {
            return res.json();
        }).then(function (data) {
            console.log('Cognito engagement sent:', data);
        }).catch(function (err) {
            console.error('Cognito tracker error:', err);
        });
    }

    setInterval(sendEngagementData, 10000);
    window.addEventListener('beforeunload', sendEngagementData);
})();