import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { employeesApi } from '../../api/employees.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { downloadBlob } from '../../utils/downloadFile';

export default function CsvImport() {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(null);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setDryRunReport(null);
    setCommitSuccess(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCsvText(text);
        setParsedRows(rows);
      } catch (err) {
        setError('Failed to parse CSV format.');
      }
    };
    reader.readAsText(selectedFile);
  }

  function parseCsvText(csv) {
    const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  }

  async function handleDryRun() {
    if (parsedRows.length === 0) {
      setError('Please choose a non-empty CSV file.');
      return;
    }

    try {
      setValidating(true);
      setError(null);
      const res = await employeesApi.dryRunCsv(parsedRows);
      setDryRunReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Validation error.');
    } finally {
      setValidating(false);
    }
  }

  async function handleCommit() {
    if (!dryRunReport?.can_import) return;
    try {
      setCommitting(true);
      setError(null);
      const res = await employeesApi.commitCsv(parsedRows);
      setCommitSuccess(res.data.message);
      setDryRunReport(null);
      setParsedRows([]);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Import commit failed.');
    } finally {
      setCommitting(false);
    }
  }

  function downloadSampleCsv() {
    const sample = `employee_code,first_name,last_name,email,phone,gender,department,joining_date,basic_salary\nEMP-101,Zubair,Ahmed,zubair.ahmed@example.com,03001234567,male,Engineering,2026-01-15,65000\nEMP-102,Fatima,Noor,fatima.noor@example.com,03219876543,female,HR,2026-02-01,55000\nEMP-103,Bilal,Tariq,bilal.tariq@example.com,03335554433,male,Finance,2026-03-10,75000`;
    downloadBlob(new Blob([sample], { type: 'text/csv' }), 'sample_employee_import.csv');
  }

  const errorColumns = [
    {
      header: 'CSV Row #',
      key: 'row',
      render: (r) => <span className="font-mono font-bold text-slate-800">Row {r.row}</span>
    },
    {
      header: 'Field Name',
      key: 'field',
      render: (r) => <span className="font-mono text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{r.field}</span>
    },
    {
      header: 'Validation Failure Reason',
      key: 'reason',
      render: (r) => <span className="text-xs text-rose-600">{r.reason}</span>
    }
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Employee CSV Import</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-flight dry-run engine verifies schema, unique constraints, and department mappings
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={downloadSampleCsv}
        >
          Download CSV Template
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {commitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {/* Upload Box */}
      <Card title="Upload CSV File" subtitle="Select a CSV formatted file with employee records">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-teal-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700 mb-1">
            {file ? file.name : 'Choose CSV file to upload'}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Supports UTF-8 CSV with standard comma delimiter
          </p>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-sm">
              Browse Files
            </span>
          </label>

          {parsedRows.length > 0 && (
            <div className="mt-4 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
              {parsedRows.length} rows parsed from file
            </div>
          )}
        </div>

        {parsedRows.length > 0 && !dryRunReport && (
          <div className="flex justify-end mt-4">
            <Button
              variant="primary"
              size="md"
              loading={validating}
              onClick={handleDryRun}
              icon={Upload}
            >
              Run Dry-Run Preflight Validation
            </Button>
          </div>
        )}
      </Card>

      {/* Dry Run Error Report */}
      {dryRunReport && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border bg-white shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dryRunReport.can_import ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {dryRunReport.can_import ? 'Validation Passed — Ready for Import' : 'Preflight Validation Found Issues'}
                </h4>
                <p className="text-xs text-slate-500">
                  Total Rows: {dryRunReport.total_rows} &bull; Valid Rows: {dryRunReport.valid_count} &bull; Errors: {dryRunReport.error_count}
                </p>
              </div>
            </div>

            {dryRunReport.can_import && (
              <Button
                variant="primary"
                size="md"
                loading={committing}
                onClick={handleCommit}
                icon={ArrowRight}
              >
                Commit & Import {dryRunReport.valid_count} Employees
              </Button>
            )}
          </div>

          {!dryRunReport.can_import && (
            <Card title="Dry-Run Error Breakdown" subtitle="Correct these issues in your CSV file before proceeding">
              <Table
                columns={errorColumns}
                data={dryRunReport.errors || []}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
