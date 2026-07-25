import { ExportService } from './export.service';
import type { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

function makePrisma(website: any, pageViews: any[]) {
  return {
    website: { findFirst: jest.fn().mockResolvedValue(website) },
    pageView: { findMany: jest.fn().mockResolvedValue(pageViews) },
  } as unknown as PrismaService;
}

describe('ExportService', () => {
  const baseRow = {
    path: '/blog/post',
    referrer: null,
    device: 'desktop',
    browser: 'Chrome',
    country: 'UZ',
    duration: 42,
    scrollDepth: 80,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('throws NotFoundException when the website is not owned by the user', async () => {
    const service = new ExportService(makePrisma(null, []));
    await expect(
      service.exportWebsitePageviews('user-1', 'site-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an empty string when there are no rows', async () => {
    const service = new ExportService(makePrisma({ id: 'site-1' }, []));
    const csv = await service.exportWebsitePageviews('user-1', 'site-1');
    expect(csv).toBe('');
  });

  it('quotes fields containing commas or newlines', async () => {
    const rows = [{ ...baseRow, path: '/a,b', referrer: 'line1\nline2' }];
    const service = new ExportService(makePrisma({ id: 'site-1' }, rows));
    const csv = await service.exportWebsitePageviews('user-1', 'site-1');
    const dataLine = csv.split('\n').slice(1).join('\n'); // qolgan qatorlar (referrer newline ichida)
    expect(dataLine).toContain('"/a,b"');
    expect(dataLine).toContain('"line1\nline2"');
  });

  it('escapes embedded double quotes by doubling them', async () => {
    const rows = [{ ...baseRow, path: '/path with "quotes"' }];
    const service = new ExportService(makePrisma({ id: 'site-1' }, rows));
    const csv = await service.exportWebsitePageviews('user-1', 'site-1');
    expect(csv).toContain('"/path with ""quotes"""');
  });

  it('neutralizes formula-injection payloads (=, +, -, @) with a leading apostrophe', async () => {
    const rows = [{ ...baseRow, referrer: '=cmd|"/c calc"!A1' }];
    const service = new ExportService(makePrisma({ id: 'site-1' }, rows));
    const csv = await service.exportWebsitePageviews('user-1', 'site-1');
    // referrer ustuni endi "'=cmd|..." bilan boshlanadi va qo'shtirnoq ichida
    expect(csv).toMatch(/"'=cmd\|/);
  });

  it('produces a normal unquoted field for plain values', async () => {
    const rows = [baseRow];
    const service = new ExportService(makePrisma({ id: 'site-1' }, rows));
    const csv = await service.exportWebsitePageviews('user-1', 'site-1');
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'timestamp,path,referrer,device,browser,country,duration_sec,scroll_depth_pct,utm_source,utm_medium,utm_campaign',
    );
    expect(lines[1]).toBe(
      '2026-01-01T00:00:00.000Z,/blog/post,,desktop,Chrome,UZ,42,80,,,',
    );
  });
});
