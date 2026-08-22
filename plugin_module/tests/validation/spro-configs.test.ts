import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIGS_DIR = join(__dirname, '..', '..', 'configs');

const MODULES = ['SD', 'MM', 'FI', 'CO', 'PP', 'PS', 'PM', 'QM', 'TR', 'HCM', 'WM', 'TM', 'Ariba', 'BW'];
const CONFIG_FILES = ['spro.md', 'tcodes.md', 'bapi.md', 'workflows.md'];

describe('SPRO Config MD Files Validation', () => {
  for (const mod of MODULES) {
    describe(`${mod} module`, () => {
      for (const file of CONFIG_FILES) {
        const filePath = join(CONFIGS_DIR, mod, file);

        it(`${file} exists`, () => {
          expect(existsSync(filePath), `Missing: configs/${mod}/${file}`).toBe(true);
        });

        it(`${file} is not empty`, () => {
          if (!existsSync(filePath)) return;
          const content = readFileSync(filePath, 'utf-8');
          expect(content.trim().length).toBeGreaterThan(100);
        });

        if (file === 'spro.md') {
          it(`${file} contains table/view references`, () => {
            if (!existsSync(filePath)) return;
            const content = readFileSync(filePath, 'utf-8');
            // SPRO files should contain pipe-delimited tables
            expect(content).toContain('|');
            // Should have at least some SAP table/view references
            expect(content).toMatch(/[VT]_?\w{2,}/);
          });
        }

        if (file === 'tcodes.md') {
          it(`${file} contains transaction codes`, () => {
            if (!existsSync(filePath)) return;
            const content = readFileSync(filePath, 'utf-8');
            expect(content).toContain('|');
            // Transaction codes are typically uppercase
            expect(content).toMatch(/[A-Z]{2}\d{2}/);
          });
        }

        if (file === 'bapi.md') {
          it(`${file} contains BAPI references`, () => {
            if (!existsSync(filePath)) return;
            const content = readFileSync(filePath, 'utf-8');
            expect(content.toUpperCase()).toMatch(/BAPI|FM|FUNCTION/i);
          });
        }
      }
    });
  }

  it('total config file count is 56', () => {
    let count = 0;
    for (const mod of MODULES) {
      for (const file of CONFIG_FILES) {
        if (existsSync(join(CONFIGS_DIR, mod, file))) count++;
      }
    }
    expect(count).toBe(56);
  });
});
