/**
 * Narrow, offline teaching adapter. Not a complete ASFF validator or sanitizer.
 * Only the fictional account/resource used by the bundled fixture are accepted.
 */
export const publicAccessFields = Object.freeze([
  "BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets",
]);
function object(value, allowed, label, required = allowed) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).some((key) => !allowed.includes(key)) ||
      required.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`Unsupported or incomplete ${label}`);
  }
}
export function reviewSyntheticAsff(input) {
  object(input, ["SchemaVersion", "Id", "ProductArn", "GeneratorId", "AwsAccountId",
    "Types", "CreatedAt", "UpdatedAt", "Severity", "Title", "Description",
    "Compliance", "RecordState", "Resources"], "finding");
  if (input.SchemaVersion !== "2018-10-08" ||
      input.AwsAccountId !== "000000000000" || input.Id !== "synthetic/asff/s3-8" ||
      input.ProductArn !== "arn:aws:securityhub:us-east-1::product/aws/securityhub" ||
      input.GeneratorId !== "security-control/S3.8" || input.RecordState !== "ACTIVE") {
    throw new Error("Unsupported synthetic finding scope");
  }
  object(input.Compliance, ["Status", "SecurityControlId"], "compliance");
  if (input.Compliance.SecurityControlId !== "S3.8" || input.Compliance.Status !== "FAILED") {
    throw new Error("Only an active failed S3.8 fixture is supported");
  }
  object(input.Severity, ["Label"], "severity");
  if (!["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(input.Severity.Label) ||
      !Array.isArray(input.Types) || input.Types.length !== 1 ||
      input.Types[0] !== "Software and Configuration Checks/Industry and Regulatory Standards" ||
      ["Title", "Description"].some((key) => typeof input[key] !== "string" || input[key].length > 1024) ||
      ["CreatedAt", "UpdatedAt"].some((key) => typeof input[key] !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input[key]) ||
        !Number.isFinite(Date.parse(input[key])) ||
        new Date(input[key]).toISOString() !== input[key]) ||
      Date.parse(input.UpdatedAt) < Date.parse(input.CreatedAt)) {
    throw new Error("Invalid fixture metadata");
  }
  if (!Array.isArray(input.Resources) || input.Resources.length !== 1) {
    throw new Error("Exactly one synthetic resource is required");
  }
  const resource = input.Resources[0];
  object(resource, ["Type", "Id", "Partition", "Region", "Details"], "resource");
  if (resource.Type !== "AwsS3Bucket" || resource.Id !== "arn:aws:s3:::synthetic-review-lab" ||
      resource.Partition !== "aws" || resource.Region !== "us-east-1") {
    throw new Error("Unsupported synthetic resource scope");
  }
  object(resource.Details, ["AwsS3Bucket"], "resource details");
  object(resource.Details.AwsS3Bucket, ["PublicAccessBlockConfiguration"], "S3 details");
  const configuration = resource.Details.AwsS3Bucket.PublicAccessBlockConfiguration;
  object(configuration, publicAccessFields, "public access configuration");
  if (publicAccessFields.some((field) => typeof configuration[field] !== "boolean")) {
    throw new Error("All four public access fields must be explicit booleans");
  }
  const changedFields = publicAccessFields.filter((field) => !configuration[field]);
  if (!changedFields.length) throw new Error("Fixture is inconsistent: failed S3.8 with all four flags true");
  // Select only known structured fields. Free-text content never selects an action.
  return {
    mode: "offline-synthetic-asff-review",
    source: { control: "S3.8", resourceType: "AwsS3Bucket", updatedAt: input.UpdatedAt },
    candidate: {
      action: "REVIEW_BUCKET_PUBLIC_ACCESS_BLOCK",
      resource: "synthetic-review-lab",
      before: Object.fromEntries(publicAccessFields.map((field) => [field, configuration[field]])),
      proposedAfter: Object.fromEntries(publicAccessFields.map((field) => [field, true])),
      changedFields,
    },
    requiresHumanReview: true,
    executable: false,
    cloudCalls: 0,
    cautions: [
      "This snapshot is not live state and must not authorize a change.",
      "Confirm whether public access is intentional before planning remediation.",
      "Four S3 flags are preserved; they are not collapsed into the core lab boolean.",
      "No account-level or access-point evaluation, authenticated approval or cloud execution.",
    ],
  };
}
