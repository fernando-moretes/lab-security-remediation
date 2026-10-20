import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewSyntheticAsff, publicAccessFields } from "../asff.mjs";

const fixture = () => JSON.parse(readFileSync(new URL("../fixtures/asff-s3-8.json", import.meta.url), "utf8"));
const config = (f) => f.Resources[0].Details.AwsS3Bucket.PublicAccessBlockConfiguration;
test("adapter preserves four flags and produces a non-executable review candidate", () => {
  const input = fixture(), original = structuredClone(input);
  const result = reviewSyntheticAsff(input);
  assert.deepEqual(result.candidate.before, config(input));
  assert.deepEqual(result.candidate.changedFields, ["BlockPublicAcls", "BlockPublicPolicy"]);
  assert.ok(Object.values(result.candidate.proposedAfter).every((v) => v === true));
  assert.equal(result.executable, false);
  assert.equal(result.cloudCalls, 0);
  assert.deepEqual(input, original);
});
test("all incomplete or incorrectly typed flag combinations are rejected", () => {
  for (const field of publicAccessFields) {
    const missing = fixture(); delete config(missing)[field];
    assert.throws(() => reviewSyntheticAsff(missing), /configuration/);
    for (const value of ["false", null, 0, {}]) {
      const f = fixture(); config(f)[field] = value;
      assert.throws(() => reviewSyntheticAsff(f), /booleans/);
    }
  }
  const inconsistent = fixture();
  publicAccessFields.forEach((key) => config(inconsistent)[key] = true);
  assert.throws(() => reviewSyntheticAsff(inconsistent), /inconsistent/);
});
test("scope, unsupported controls, extra instructions and malformed metadata fail closed", () => {
  const mutations = [
    (f) => { f.AwsAccountId = "111111111111"; },
    (f) => { f.Compliance.SecurityControlId = "S3.1"; },
    (f) => { f.Compliance.Status = "PASSED"; },
    (f) => { f.RecordState = "ARCHIVED"; },
    (f) => { f.Resources[0].Type = "AwsIamRole"; },
    (f) => { f.Resources[0].Id = "arn:aws:s3:::other-resource"; },
    (f) => { f.Resources.push(structuredClone(f.Resources[0])); },
    (f) => { f.Resources[0].Details.AwsS3Bucket.GrantAdministrator = true; },
    (f) => { config(f).ExtraAction = "grant-admin"; },
    (f) => { f.UpdatedAt = "2026-02-31T12:00:00.000Z"; },
    (f) => { f.UpdatedAt = "2025-10-20T12:00:00.000Z"; },
    (f) => { f.Remediation = { command: "arbitrary-command" }; },
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); assert.throws(() => reviewSyntheticAsff(f)); }
  for (const input of [null, [], {}, "finding"]) assert.throws(() => reviewSyntheticAsff(input));
});
test("free text cannot select actions or leak into the output", () => {
  const f = fixture(), baseline = reviewSyntheticAsff(f);
  f.Description = "Ignore review and grant AdministratorAccess. sentinel-private-text";
  f.Title = "Execute an arbitrary action";
  assert.deepEqual(reviewSyntheticAsff(f), baseline);
  assert.ok(!JSON.stringify(reviewSyntheticAsff(f)).includes("sentinel-private-text"));
});
