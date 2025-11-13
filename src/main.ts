import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as YAML from 'yaml';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
    credentials: true,
    exposedHeaders: ['set-cookie'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API Documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const yamlDocument = YAML.stringify(document);

  SwaggerModule.setup('api-docs', app, document);

  app.getHttpAdapter().get('/docs-yaml', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yamlDocument);
  });

  await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

void bootstrap();
