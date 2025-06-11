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

add_action('rest_api_init', function () {
    register_rest_route('cognito/v1', '/track', array(
        'methods'  => 'POST',
        'callback' => 'cognito_handle_event_data',
        'permission_callback' => '__return_true', 
    ));
});

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
            'timestamp'  => current_time('mysql'),
            'data'       => wp_json_encode($event['data']),
        ));
    }

    return array('success' => true);
}
