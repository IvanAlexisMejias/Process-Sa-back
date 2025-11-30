import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'Process SA · Control de Tareas',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
