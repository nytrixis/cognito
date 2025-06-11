(function () {
    console.log('Cognito tracker loaded');
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
            data: { percent: percent, maxScroll: maxScroll, timestamp: Date.now(), localTime: new Date().toLocaleString(), localTime: new Date().toLocaleString()   }
        });
    });

    window.addEventListener('mousemove', function () {
        mouseMoves++;
        lastMouseMove = Date.now();
    });

    window.addEventListener('click', function (e) {
        var target = e.target;
        events.push({
            type: 'click',
            data: {
                tag: target.tagName,
                id: target.id || null,
                classes: target.className || null,
                name: target.name || null,
                type: target.type || null,
                text: target.innerText ? target.innerText.substring(0, 100) : null,
                value: target.value || null,
                href: target.href || null,
                timestamp: Date.now(),
                localTime: new Date().toLocaleString() 
            }
        });
    });

    document.querySelectorAll('video').forEach(function(video) {
        video.addEventListener('play', function () {
            events.push({
                type: 'video_play',
                data: {
                    src: video.currentSrc,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });

        video.addEventListener('pause', function () {
            events.push({
                type: 'video_pause',
                data: {
                    src: video.currentSrc,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
        video.addEventListener('ended', function () {
            events.push({
                type: 'video_ended',
                data: {
                    src: video.currentSrc,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString()
                }
            });
        });
        video.addEventListener('seeked', function () {
            events.push({
                type: 'video_seeked',
                data: {
                    src: video.currentSrc,
                    currentTime: video.currentTime,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString()
                }
            });
        });
    });
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function (e) {
            events.push({
                type: 'form_submit',
                data: {
                    action: form.action,
                    id: form.id || null,
                    classes: form.className || null,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
    });

    document.querySelectorAll('input, textarea, select').forEach(function(input) {
        input.addEventListener('change', function (e) {
            if (input.type !== 'password') {
                events.push({
                    type: 'input_change',
                    data: {
                        tag: input.tagName,
                        id: input.id || null,
                        classes: input.className || null,
                        name: input.name || null,
                        type: input.type || null,
                        value: input.value || null,
                        checked: input.checked !== undefined ? input.checked : null,
                        timestamp: Date.now(),
                        localTime: new Date().toLocaleString() 
                    }
                });
            }
        });
    });

    document.querySelectorAll('input, textarea, select').forEach(function(input) {
        input.addEventListener('focus', function () {
            events.push({
                type: 'input_focus',
                data: {
                    tag: input.tagName,
                    id: input.id || null,
                    name: input.name || null,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
        input.addEventListener('blur', function () {
            events.push({
                type: 'input_blur',
                data: {
                    tag: input.tagName,
                    id: input.id || null,
                    name: input.name || null,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
    });

    document.querySelectorAll('*').forEach(function(el) {
        el.addEventListener('mouseover', function () {
            events.push({
                type: 'mouseover',
                data: {
                    tag: el.tagName,
                    id: el.id || null,
                    classes: el.className || null,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
        el.addEventListener('mouseout', function () {
            events.push({
                type: 'mouseout',
                data: {
                    tag: el.tagName,
                    id: el.id || null,
                    classes: el.className || null,
                    timestamp: Date.now(),
                    localTime: new Date().toLocaleString() 
                }
            });
        });
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