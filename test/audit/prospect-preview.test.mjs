import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assembleAuditPacket } from '../../src/audit/audit-packet.mjs';
import { buildProspectPreview } from '../../src/audit/prospect-preview.mjs';

test('l’aperçu retient une correction commerciale étayée sur le site', async () => {
  const run = JSON.parse(await readFile(new URL('../fixtures/audit-packet/complete-audit-run.json', import.meta.url), 'utf8'));
  const site = run.input.domain;
  const finding = 'L’accueil publie le minimum de commande en livraison.';
  const improvement = 'Ajoutez le lien vers les conditions de livraison sur la carte.';
  const benefit = 'Les clients peuvent vérifier le minimum pendant leur choix.';
  run.modules.observation = {
    observations: [
      { id: 'delivery', url: site, fact: finding },
      { id: 'elsewhere', url: 'https://elsewhere.example/', fact: 'Une information externe.' },
    ],
    priorities: [
      { title: 'Vérifier le panier', topic: 'SITE', confidence: 'TO_VERIFY', effort: 'DIAGNOSIS', applicationBasis: 'USABILITY', consequence: 'Le total reste à vérifier.', correction: 'Ouvrir le panier.', observationIds: ['delivery'] },
      { title: 'Rendre les conditions accessibles', topic: 'SITE', confidence: 'SUPPORTED', effort: 'IMPLEMENTATION', applicationBasis: 'USABILITY', consequence: benefit, correction: improvement, observationIds: ['delivery'] },
      { title: 'Une autre priorité', topic: 'SITE', confidence: 'SUPPORTED', effort: 'IMPLEMENTATION', applicationBasis: 'USABILITY', consequence: 'Une autre conséquence.', correction: 'Une autre correction.', observationIds: ['elsewhere'] },
    ],
  };
  const preview = () => buildProspectPreview(run, assembleAuditPacket({ auditRun: run }).packet);
  assert.deepEqual(preview(), { finding, improvement, benefit });
  run.modules.observation.priorities.splice(1, 1);
  assert.equal(preview(), null);
  run.input.domain = null;
  assert.equal(preview(), null);
});
