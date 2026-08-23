import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { buildGrcExport, type ControlExecution } from "@/lib/flowguard";
import { createSimulatedPaymentFailureTrace, evaluateImportedTrace, parseProcessContract, parseTraceExport, type ImportedTrace, type ProcessContract } from "@/lib/traceIngestion";
import { trpc } from "@/lib/trpc";
import { createDraftException, toDatabaseSeverity, toDatabaseStatus, type StudioException } from "./model";
import { traceStudioTemplates, type TraceStudioTemplate } from "./templates";

export function useTraceStudio() {
  const { isAuthenticated } = useAuth();
  const [activeTemplate, setActiveTemplate] = useState<TraceStudioTemplate>(traceStudioTemplates[0]);
  const [contractYaml, setContractYaml] = useState(traceStudioTemplates[0].yaml);
  const [trace, setTrace] = useState<ImportedTrace | null>(null);
  const [contract, setContract] = useState<ProcessContract | null>(null);
  const [execution, setExecution] = useState<ControlExecution | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exception, setException] = useState<StudioException | null>(null);
  const [liveBackend, setLiveBackend] = useState<"jaeger" | "tempo">("jaeger");
  const [liveTraceId, setLiveTraceId] = useState("");
  const [contractId, setContractId] = useState<number | null>(null);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const utils = trpc.useUtils();
  const backendStatus = trpc.flowguard.configuredBackends.useQuery();
  const fetchLive = trpc.flowguard.fetchLiveTrace.useQuery({ backend: liveBackend, traceId: liveTraceId || "trace-pending" }, { enabled: false, retry: false });
  const saveContract = trpc.flowguard.saveContract.useMutation();
  const saveExecution = trpc.flowguard.saveExecution.useMutation();
  const createException = trpc.flowguard.createException.useMutation();
  const updateException = trpc.flowguard.updateException.useMutation();
  const savedContracts = trpc.flowguard.listContracts.useQuery(undefined, { enabled: isAuthenticated });
  const savedExecutions = trpc.flowguard.listExecutions.useQuery(undefined, { enabled: isAuthenticated });
  const savedExceptions = trpc.flowguard.listExceptions.useQuery(undefined, { enabled: isAuthenticated });
  const exportPayload = useMemo(() => execution ? buildGrcExport(execution) : null, [execution]);

  function selectTemplate(template: TraceStudioTemplate) {
    setActiveTemplate(template);
    setContractYaml(template.yaml);
    setContract(null);
    setExecution(null);
    setException(null);
    setContractId(null);
    setMessage(`${template.title} template loaded. Review and adapt it before execution.`);
    setError(null);
  }

  function updateContractYaml(value: string) {
    setContractYaml(value);
    setContract(null);
    setContractId(null);
  }

  function validateContract() {
    try {
      const parsed = parseProcessContract(contractYaml);
      setContract(parsed);
      setError(null);
      setMessage(`Contract valid: ${parsed.process} with ${parsed.required.length} required assertions.`);
      return parsed;
    } catch (parseError) {
      setContract(null);
      setError(parseError instanceof Error ? parseError.message : "Contract validation failed.");
      setMessage(null);
      return null;
    }
  }

  function setImported(imported: ImportedTrace) {
    setTrace(imported);
    setExecution(null);
    setException(null);
    setError(null);
    setMessage(`${imported.spans.length} spans loaded from ${imported.sourceName}. Detected ${imported.sourceShape}.`);
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    try {
      setImported(parseTraceExport(await file.text(), file.name));
    } catch (uploadError) {
      setTrace(null);
      setExecution(null);
      setError(uploadError instanceof Error ? uploadError.message : "Trace import failed.");
      setMessage(null);
    }
  }

  async function loadLiveTrace() {
    if (!liveTraceId.trim()) {
      setError("Enter a trace identifier before requesting a configured Jaeger or Tempo endpoint.");
      return;
    }
    try {
      const result = await fetchLive.refetch();
      if (!result.data) throw result.error ?? new Error("No trace payload was returned.");
      setImported(parseTraceExport(JSON.stringify(result.data.payload), `${result.data.backend}:${result.data.traceId}`));
    } catch (liveError) {
      setError(liveError instanceof Error ? liveError.message : "Live trace retrieval failed. Check the configured endpoint and trace identifier.");
    }
  }

  function loadSimulatedTrace() {
    setError(null);
    setMessage("Preparing the clearly labelled portfolio fixture…");
    setSimulatedProgress(18);
    window.setTimeout(() => setSimulatedProgress(58), 180);
    window.setTimeout(() => setSimulatedProgress(84), 360);
    window.setTimeout(() => {
      try {
        setImported(createSimulatedPaymentFailureTrace());
        setSimulatedProgress(100);
        toast.success("Simulated payment failure loaded", { description: "The fixture is ready for control evaluation; it is not live telemetry." });
        window.setTimeout(() => setSimulatedProgress(0), 720);
      } catch (loadError) {
        setSimulatedProgress(0);
        const detail = loadError instanceof Error ? loadError.message : "The portfolio fixture could not be prepared.";
        setError(detail);
        toast.error("Simulated trace failed to load", { description: detail });
      }
    }, 560);
  }

  function runTrace() {
    const activeContract = contract ?? validateContract();
    if (!activeContract || !trace) {
      if (!trace) setError("Import an export or request a configured live trace before running the contract.");
      return;
    }
    const result = evaluateImportedTrace(trace, activeContract);
    result.controlKey = activeTemplate.controlKey;
    setExecution(result);
    setException(createDraftException(result));
    setError(null);
    setMessage(`Control execution completed: ${result.verdict}. Persist it to create an immutable evidence record.`);
  }

  async function persistContract() {
    const parsed = contract ?? validateContract();
    if (!parsed) return;
    try {
      const saved = await saveContract.mutateAsync({ controlKey: activeTemplate.controlKey, title: activeTemplate.title, domain: activeTemplate.domain, yaml: contractYaml, version: "v1" });
      setContractId(saved.id);
      setMessage(`Contract saved as FG-CON-${saved.id}.`);
      await utils.flowguard.listContracts.invalidate();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sign in to save the contract.");
    }
  }

  async function persistExecution() {
    if (!execution) return;
    try {
      const saved = await saveExecution.mutateAsync({ contractId: contractId ?? undefined, controlKey: execution.controlKey, process: execution.process, verdict: execution.verdict, traceId: execution.traceId, evidenceHash: execution.evidenceHash, provenanceLabel: execution.provenanceLabel, provenanceSource: execution.provenanceSource, finding: execution.firstFinding, assertions: execution.assertions, executedAt: new Date(execution.runAt) });
      if (exception && !exception.id) {
        const created = await createException.mutateAsync({ executionId: saved.id, controlKey: execution.controlKey, title: execution.firstFinding?.label ?? "Technical control exception", severity: toDatabaseSeverity(exception.severity), ownerLabel: exception.owner, dueAt: new Date(`${exception.dueDate}T00:00:00Z`), remediation: exception.remediation });
        setException({ ...exception, id: created.id, displayId: `EXC-${created.id}` });
        await utils.flowguard.listExceptions.invalidate();
      }
      await utils.flowguard.listExecutions.invalidate();
      setMessage(`Execution saved as FG-EXE-${saved.id}${exception ? " with a linked GRC exception." : "."}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sign in to persist the execution.");
    }
  }

  async function persistException() {
    if (!exception) return;
    if (!exception.id) {
      await persistExecution();
      return;
    }
    try {
      await updateException.mutateAsync({ id: exception.id, status: toDatabaseStatus(exception.status), severity: toDatabaseSeverity(exception.severity), ownerLabel: exception.owner, dueAt: new Date(`${exception.dueDate}T00:00:00Z`), remediation: exception.remediation, retestStatus: exception.status === "Closed" ? "PASSED" : "PENDING" });
      setMessage(`Exception ${exception.displayId} updated in the FlowGuard database.`);
      await utils.flowguard.listExceptions.invalidate();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sign in to update the exception.");
    }
  }

  return {
    activeTemplate, backendStatus, contractYaml, error, exception, exportPayload, fetchLive, handleUpload, isAuthenticated, liveBackend, liveTraceId, loadLiveTrace, loadSimulatedTrace, message, persistContract, persistException, persistExecution, runTrace, saveContract, saveExecution, savedContracts, savedExceptions, savedExecutions, selectTemplate, setException, setLiveBackend, setLiveTraceId, simulatedProgress, trace, updateContractYaml, validateContract, execution,
  };
}
