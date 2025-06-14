<?php
/*
Plugin Name: Cognito - AI-Powered Reader Engagement & Cognitive Load Analytics
Description: Analyze reader engagement and cognitive load using real-time heuristics and actionable insights.
Version: 1.0
Author: Nandini Pandey
*/

register_activation_hook(__FILE__, 'cognito_activate');
function cognito_activate() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    $table_sessions = $wpdb->prefix . 'cognito_sessions';
    $sql_sessions = "CREATE TABLE $table_sessions (
        session_id VARCHAR(36) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        post_id BIGINT UNSIGNED NOT NULL,
        page_url TEXT,
        start_time DATETIME,
        end_time DATETIME,
        user_agent TEXT,
        is_anonymous TINYINT(1) DEFAULT 1, 
        PRIMARY KEY (session_id)
    ) $charset_collate;";

    // Events table
    $table_events = $wpdb->prefix . 'cognito_events';
    $sql_events = "CREATE TABLE $table_events (
        event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        session_id VARCHAR(36) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        timestamp DATETIME,
        data JSON,
        PRIMARY KEY (event_id),
        KEY session_id (session_id)
    ) $charset_collate;";

    // Scores table
    $table_scores = $wpdb->prefix . 'cognito_scores';
    $sql_scores = "CREATE TABLE $table_scores (
        score_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        session_id VARCHAR(36) NOT NULL,
        post_id BIGINT UNSIGNED NOT NULL,
        section_id VARCHAR(100) NULL,
        cognitive_score FLOAT,
        timestamp DATETIME,
        PRIMARY KEY (score_id),
        KEY session_id (session_id),
        KEY post_id (post_id)
    ) $charset_collate;";

    dbDelta($sql_sessions);
    dbDelta($sql_events);
    dbDelta($sql_scores);
}

register_deactivation_hook(__FILE__, 'cognito_deactivate');
function cognito_deactivate() {

}

add_action('wp_enqueue_scripts', 'cognito_enqueue_tracker');
function cognito_enqueue_tracker() {
    if (is_singular()) {
        wp_enqueue_script(
            'cognito-tracker',
            plugins_url('assets/js/tracker.js', __FILE__),
            array(), // dependencies
            '1.0',
            true // in footer
        );
        // Pass post ID to JS
        global $post;
        if ($post) {
            wp_localize_script('cognito-tracker', 'cognitoPostId', $post->ID);
        }
    }
}

add_action('admin_menu', 'cognito_register_admin_page');
function cognito_register_admin_page() {
    add_menu_page(
        'Cognito Dashboard',
        'Cognito Dashboard',
        'manage_options',
        'cognito-dashboard',
        'cognito_render_admin_page',
        'dashicons-chart-bar',
        25
    );
}

add_action('admin_enqueue_scripts', 'cognito_enqueue_admin_dashboard');
function cognito_enqueue_admin_dashboard($hook) {
    if ($hook !== 'toplevel_page_cognito-dashboard') {
        return;
    }
    $dir = plugin_dir_path(__FILE__) . 'admin/dashboard/build/';
    $url = plugin_dir_url(__FILE__) . 'admin/dashboard/build/';
    $asset_file = $dir . 'index.asset.php';
    if (file_exists($asset_file)) {
        $asset = include $asset_file;
        wp_enqueue_script(
            'cognito-dashboard',
            $url . 'index.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );
        wp_enqueue_style(
            'cognito-dashboard',
            $url . 'index.css',
            [],
            $asset['version']
        );
        wp_localize_script('cognito-dashboard', 'cognitoDashboard', [
        'nonce' => wp_create_nonce('wp_rest')
    ]);
    }
}

add_action('rest_api_init', function () {
    register_rest_route('cognito/v1', '/track', array(
        'methods'  => 'POST',
        'callback' => 'cognito_handle_event_data',
        'permission_callback' => '__return_true'
    ));
});

add_action('rest_api_init', function () {
    register_rest_route('cognito/v1', '/events', array(
        'methods'  => 'GET',
        'callback' => 'cognito_get_events',
        'permission_callback' => '__return_true'
    ));
});

add_action('rest_api_init', function () {
    register_rest_route('cognito/v1', '/filteredEvents', [
        'methods' => 'GET',
        'callback' => 'cognito_get_events',
        'permission_callback' => '__return_true'
    ]);
});

add_action('rest_api_init', function () {
    register_rest_route('cognito/v1', '/heatmap', [
        'methods' => 'GET',
        'callback' => 'cognito_get_heatmap_events',
        'permission_callback' => '__return_true'
    ]);
});

add_action('rest_api_init', function() {
  register_rest_route('cognito/v1', '/ai_suggest', [
    'methods' => 'POST',
    'callback' => 'cognito_ai_suggest_callback',
    'permission_callback' => '__return_true'
  ]);
});

function cognito_ai_suggest_callback(WP_REST_Request $request) {
    $content = $request->get_param('content');
    if (!$content) {
        return new WP_Error('no_content', 'No content provided', ['status' => 400]);
    }
    $paragraphs = preg_split('/\n+/', strip_tags($content));
    $paragraphs = array_filter(array_map('trim', $paragraphs));

    $suggestions = [];
    foreach ($paragraphs as $i => $p) {
        // Compose prompt for OpenAI
        $prompt = "This is a paragraph from a blog post:\n\n\"$p\"\n\nSuggest how to make it easier to understand for a general audience. Be specific and concise.";
        $response = cognito_call_openai($prompt);
        $suggestions[] = [
            'paragraph' => $i + 1,
            'suggestion' => $response ?: 'No suggestion available.'
        ];
    }

    return ['status' => 'ok', 'suggestions' => $suggestions];
}

function cognito_call_openai($prompt) {
    $api_key = defined('COGNITO_OPENAI_API_KEY') ? COGNITO_OPENAI_API_KEY : '';
    if (!$api_key) return null;

    $data = [
        'model' => 'llama3-8b-8192',
        'messages' => [
            ['role' => 'system', 'content' => 'You are a helpful writing assistant.'],
            ['role' => 'user', 'content' => $prompt]
        ],
        'max_tokens' => 120,
        'temperature' => 0.7,
    ];

    $args = [
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $api_key,
        ],
        'body' => json_encode($data),
        'timeout' => 30,
    ];

    $res = wp_remote_post('https://api.groq.com/v1/chat/completions', $args);
    error_log(print_r($res, true)); // Add this line
    if (is_wp_error($res)) return null;
    $body = json_decode(wp_remote_retrieve_body($res), true);
    error_log(print_r($body, true)); // Add this line
    return $body['choices'][0]['message']['content'] ?? null;
}

function cognito_get_heatmap_events(WP_REST_Request $request) {
    global $wpdb;
    $post_id = intval($request->get_param('post_id'));
    $table_events = $wpdb->prefix . 'cognito_events';
    $table_sessions = $wpdb->prefix . 'cognito_sessions';
    $session_ids = $wpdb->get_col($wpdb->prepare(
        "SELECT session_id FROM $table_sessions WHERE post_id = %d", $post_id
    ));
    if (empty($session_ids)) return [];

    $in = implode(',', array_map(function() { return '%s'; }, $session_ids));
    $event_types = ['mousemove', 'click', 'scroll'];
    $event_in = implode(',', array_fill(0, count($event_types), '%s'));

    $query = $wpdb->prepare(
        "SELECT e.event_type, e.data
         FROM $table_events e
         WHERE e.session_id IN ($in)
           AND e.event_type IN ($event_in)
         ORDER BY e.event_id ASC",
        array_merge($session_ids, $event_types)
    );
    $results = $wpdb->get_results($query, ARRAY_A);
    foreach ($results as &$row) {
        $row['data'] = json_decode($row['data'], true);
    }
    return $results;
}

function cognito_get_events(WP_REST_Request $request) {
    global $wpdb;
    $table_events = $wpdb->prefix . 'cognito_events';
    $table_sessions = $wpdb->prefix . 'cognito_sessions';
    $post_id = $request->get_param('post_id');
    $where = '';
    $params = [];
    if ($post_id) {
        $where = 'WHERE s.post_id = %d';
        $params[] = intval($post_id);
    }
    $sql = "
        SELECT e.*, s.post_id
        FROM $table_events e
        LEFT JOIN $table_sessions s ON e.session_id = s.session_id
        $where
        ORDER BY e.event_id DESC
    ";
    $results = $wpdb->get_results($wpdb->prepare($sql, ...$params), ARRAY_A);
    foreach ($results as &$row) {
        $row['data'] = json_decode($row['data'], true);
    }
    return $results;
}
 
function cognito_render_admin_page() {
    echo '<div id="cognito-dashboard-root"></div>';
}

function cognito_handle_event_data(WP_REST_Request $request) {
    global $wpdb;

    $params = $request->get_json_params();
    if (
        empty($params['session_id']) ||
        empty($params['post_id']) ||
        empty($params['events']) ||
        !is_array($params['events'])
    ) {
        return new WP_Error('invalid_data', 'Missing or invalid data', array('status' => 400));
    }

    $user_id = get_current_user_id();
    $is_anonymous = ($user_id === 0) ? 1 : 0;

    $table_sessions = $wpdb->prefix . 'cognito_sessions';
    $table_events = $wpdb->prefix . 'cognito_events';

    // Insert session if not exists
    $session = $wpdb->get_var($wpdb->prepare(
        "SELECT session_id FROM $table_sessions WHERE session_id = %s",
        $params['session_id']
    ));
    if (!$session) {
        $wpdb->insert($table_sessions, array(
            'session_id' => $params['session_id'],
            'user_id'    => get_current_user_id(),
            'post_id'    => intval($params['post_id']),
            'page_url'   => esc_url_raw($params['page_url']),
            'start_time' => current_time('mysql'),
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'is_anonymous'=> $is_anonymous
        ));
    }

    // Insert events
    foreach ($params['events'] as $event) {
        $wpdb->insert($table_events, array(
            'session_id' => $params['session_id'],
            'event_type' => sanitize_text_field($event['type']),
            'timestamp'  => isset($event['data']['timestamp']) ? date('Y-m-d H:i:s', intval($event['data']['timestamp'])/1000) : current_time('mysql'),
            'data'       => wp_json_encode($event['data']),
        ));
    }

    return array('success' => true);
}
