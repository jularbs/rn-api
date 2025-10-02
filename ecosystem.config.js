module.exports = {
    apps: [{
        name: "rn-api",
        script: "./dist/index.js",
        instances: "max",
        exec_mode: "cluster",
        
        // Process management
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",

        // Logging
        cron_restart: "0 21 * * *", // Weekly restart on Sunday at 9 PM
        time: true,
        merge_logs: true,
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        log_file: "./logs/combined.log",
        error_file: "./logs/error.log",
        out_file: "./logs/out.log",
        
        // Performance & Health monitoring
        min_uptime: "10s",
        max_restarts: 5,
        
        // Cluster settings
        kill_timeout: 5000,
        listen_timeout: 8000,
        
        // Source map support for better error traces
        source_map_support: true,
        
        // Advanced PM2 features
        instance_var: 'INSTANCE_ID',
        
        // Graceful shutdown
        kill_retry_time: 100
    }]
}