const { EventEmitter } = require('events');

class MongoMemoryServer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      instance: {
        port: config.instance?.port || 27017,
        dbName: config.instance?.dbName || 'test',
        ip: config.instance?.ip || '127.0.0.1'
      },
      binary: {
        version: config.binary?.version || '4.0.3',
        downloadDir: config.binary?.downloadDir || '.mongodb-binaries'
      },
      ...config
    };
    this.state = 'stopped';
    this.instanceInfo = null;
  }

  static async create(config) {
    const server = new MongoMemoryServer(config);
    await server.start();
    return server;
  }

  async start() {
    if (this.state === 'running') {
      return;
    }

    this.state = 'running';
    this.instanceInfo = {
      port: this.config.instance.port,
      dbName: this.config.instance.dbName,
      dbPath: `/tmp/mongodb-memory-server-${Date.now()}`,
      uri: this.getUri()
    };

    this.emit('serverStarted', this.instanceInfo);
    return this.instanceInfo;
  }

  async stop() {
    if (this.state === 'stopped') {
      return;
    }

    this.state = 'stopped';
    this.instanceInfo = null;
    this.emit('serverStopped');
  }

  async cleanup() {
    await this.stop();
  }

  getUri() {
    const { ip, port, dbName } = this.config.instance;
    return `mongodb://${ip}:${port}/${dbName}`;
  }

  getPort() {
    return this.config.instance.port;
  }

  getDbPath() {
    return this.instanceInfo?.dbPath;
  }

  getDbName() {
    return this.config.instance.dbName;
  }
}

// Export mock class and helper functions
module.exports = {
  MongoMemoryServer,
  // Helper to create multiple instances
  MongoMemoryReplSet: class MongoMemoryReplSet extends EventEmitter {
    constructor(config = {}) {
      super();
      this.config = config;
      this.servers = [];
    }

    static async create(config) {
      const replSet = new MongoMemoryReplSet(config);
      await replSet.start();
      return replSet;
    }

    async start() {
      const count = this.config.replSet?.count || 1;
      for (let i = 0; i < count; i++) {
        const server = await MongoMemoryServer.create({
          instance: {
            port: 27017 + i,
            dbName: `test-${i}`
          }
        });
        this.servers.push(server);
      }
      this.emit('serverStarted', this.servers);
    }

    async stop() {
      await Promise.all(this.servers.map(server => server.stop()));
      this.servers = [];
      this.emit('serverStopped');
    }

    async cleanup() {
      await this.stop();
    }

    getUri() {
      return this.servers.map(server => server.getUri()).join(',');
    }
  },
  // Test helpers
  __testing: {
    createServer: async (config) => {
      return MongoMemoryServer.create(config);
    },
    clearServers: async () => {
      // Implementation for cleaning up all test servers
    },
    getRunningServers: () => {
      // Implementation for getting all running servers
    }
  }
};
