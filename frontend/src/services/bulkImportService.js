// Bulk CSV import endpoints (ADMIN only). Contracts from
// Bulk_Import_Frontend_Guide.md, backend branch feature/bulk-import.
//
//   GET    /crm/bulk-imports?type=&status=&page=&pageSize=   -> { items, page, pageSize, total }
//   GET    /crm/bulk-imports/{batchId}                        -> BulkImportDetail
//   GET    /crm/bulk-imports/{batchId}/status                 -> BulkImportStatusResponse
//   POST   /crm/bulk-imports/upload-url                       -> { batchId, uploadUrl, expiresAt }
//   POST   /crm/bulk-imports/{batchId}/confirm-upload         -> 202 { batchId, status: 'QUEUED' }
//   GET    /crm/bulk-imports/templates/{type}/download        -> CSV file (no JSON envelope)
//   GET    /crm/bulk-imports/{batchId}/original-file/download -> { downloadUrl, expiresAt }
//   GET    /crm/bulk-imports/{batchId}/errors-file/download   -> { downloadUrl, expiresAt }
//   GET    /crm/bulk-imports/{batchId}/publish-preview        -> PublishPreviewResponse
//   POST   /crm/bulk-imports/{batchId}/publish                -> { counts, publishedAt }
//   DELETE /crm/bulk-imports/{batchId}                        -> status DTO with status DISCARDED
//
// The upload itself does not go through this API: the browser PUTs the file to
// the pre-signed `uploadUrl` (see uploadFile in apiClient).
import { api, buildQuery } from './apiClient';

const BASE = '/crm/bulk-imports';

// Hands a blob to the browser as a file download.
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const bulkImportService = {
  // Newest first. pageSize is capped at 100 by the backend.
  async list({ type, status, page = 1, pageSize = 20 } = {}) {
    const data = await api.get(`${BASE}${buildQuery({ type, status, page, pageSize })}`);
    return {
      items: data?.items ?? [],
      page: data?.page ?? page,
      pageSize: data?.pageSize ?? pageSize,
      total: data?.total ?? 0,
    };
  },

  async getById(batchId) {
    return api.get(`${BASE}/${batchId}`);
  },

  async getStatus(batchId) {
    return api.get(`${BASE}/${batchId}/status`);
  },

  // Creates the batch (AWAITING_UPLOAD) and returns a URL valid for 15 minutes.
  async createUploadUrl({ type, fileName, fileSizeBytes }) {
    return api.post(`${BASE}/upload-url`, { type, fileName, fileSizeBytes });
  },

  // No body. 400 = the file never reached storage; 409 = already confirmed.
  async confirmUpload(batchId) {
    return api.post(`${BASE}/${batchId}/confirm-upload`);
  },

  // `type` is a BulkImportType; the URL wants it lowercase. The endpoint needs
  // the Bearer token, so a plain <a href> cannot be used.
  async downloadTemplate(type) {
    const slug = String(type).toLowerCase();
    const { blob, fileName } = await api.getBlob(`${BASE}/templates/${slug}/download`);
    saveBlob(blob, fileName || `${slug}-template.csv`);
  },

  // Both return a link valid for 1 hour. 410 once the files were deleted
  // (30 days after upload); errors-file is 404 when the batch has none.
  async getOriginalFileUrl(batchId) {
    return api.get(`${BASE}/${batchId}/original-file/download`);
  },

  async getErrorsFileUrl(batchId) {
    return api.get(`${BASE}/${batchId}/errors-file/download`);
  },

  async publishPreview(batchId) {
    return api.get(`${BASE}/${batchId}/publish-preview`);
  },

  // 409 = not IN_REVIEW any more. 422 = items became unpublishable since the
  // preview; the body has no issue list, so call publishPreview again.
  async publish(batchId) {
    return api.post(`${BASE}/${batchId}/publish`);
  },

  // Deletes the drafts this batch still owns. 409 unless IN_REVIEW /
  // NO_CHANGES / FAILED.
  async discard(batchId) {
    return api.delete(`${BASE}/${batchId}`);
  },
};

export default bulkImportService;
