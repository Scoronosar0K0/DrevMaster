module.exports = {
  apps: [
    {
      name: "drevmaster",
      script: "npm",
      args: "start",
      cwd: "/path/to/your/app", // Замените на реальный путь
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        JWT_SECRET: "drevmaster-secret-key-2024",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      restart_delay: 4000,
      max_memory_restart: "500M",
    },
  ],
};
