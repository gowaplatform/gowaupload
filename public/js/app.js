(() => {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileChip = document.getElementById("fileChip");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const clearFile = document.getElementById("clearFile");
  const uploadBtn = document.getElementById("uploadBtn");
  const progress = document.getElementById("progress");
  const progressBar = document.getElementById("progressBar");
  const progressLabel = document.getElementById("progressLabel");
  const result = document.getElementById("result");
  const fileUrl = document.getElementById("fileUrl");
  const copyBtn = document.getElementById("copyBtn");
  const openLink = document.getElementById("openLink");
  const status = document.getElementById("status");
  const themeToggle = document.getElementById("themeToggle");
  const dropzoneMeta = document.getElementById("dropzoneMeta");
  const retentionDaysEl = document.getElementById("retentionDays");
  const footerRetention = document.getElementById("footerRetention");
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];
  const csvText = document.getElementById("csvText");
  const csvLineCount = document.getElementById("csvLineCount");
  const countryCodeInput = document.getElementById("countryCode");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearCsvTextBtn = document.getElementById("clearCsvTextBtn");
  const adjustCsvBtn = document.getElementById("adjustCsvBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const pasteStatus = document.getElementById("pasteStatus");

  function activateTab(tab) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== tab.dataset.tab;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === index) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  function updateCsvLineCount() {
    const lines = csvText.value.split(/\r\n|\r|\n/);
    if (lines.length > 1001) {
      csvText.value = lines.slice(0, 1001).join("\n");
      pasteStatus.textContent = "Limite de 1001 linhas atingido; o restante foi removido.";
    } else {
      pasteStatus.textContent = "";
    }
    const lineCount = csvText.value.split(/\r\n|\r|\n/).length;
    csvLineCount.textContent = `${lineCount} / 1001 linhas`;
  }

  csvText.addEventListener("input", updateCsvLineCount);
  clearCsvTextBtn.addEventListener("click", () => {
    csvText.value = "";
    csvText.dispatchEvent(new Event("input", { bubbles: true }));
    csvText.focus();
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        pasteStatus.textContent = "A área de transferência está vazia.";
        return;
      }
      csvText.setRangeText(
        clipboardText,
        csvText.selectionStart,
        csvText.selectionEnd,
        "end"
      );
      csvText.dispatchEvent(new Event("input", { bubbles: true }));
      csvText.focus();
    } catch {
      pasteStatus.textContent =
        "Não foi possível acessar a área de transferência. Verifique a permissão do navegador.";
    }
  });

  function adjustCsvLine(line, countryCode) {
    const separatorIndex = line.indexOf(",");
    let phone = (separatorIndex < 0 ? line : line.slice(0, separatorIndex))
      .replace(/\D/g, "");
    if (countryCode && phone && !phone.startsWith(countryCode)) {
      phone = `${countryCode}${phone}`;
    }
    let name = separatorIndex < 0 ? phone : line.slice(separatorIndex + 1).trim();

    if (name.startsWith('"')) {
      name = name.slice(1);
      if (name.endsWith('"')) name = name.slice(0, -1);
    }
    name = name.replace(/""/g, '"');
    name = name.replace(/'/g, "´").replace(/"/g, "´´");

    return `${phone},"${name}"`;
  }

  adjustCsvBtn.addEventListener("click", () => {
    const lines = csvText.value
      .replace(/^\uFEFF/, "")
      .split(/\r\n|\r|\n/)
      .filter((line) => line.trim());
    const hasHeader = /^telefone\s*,\s*nome$/i.test((lines[0] || "").trim());
    const countryCode = countryCodeInput.value.replace(/\D/g, "");
    const records = lines
      .slice(hasHeader ? 1 : 0)
      .map((line) => adjustCsvLine(line, countryCode));
    const outputLines = ["telefone,nome", ...records];
    const wasTruncated = outputLines.length > 1001;

    csvText.value = outputLines.slice(0, 1001).join("\n");
    csvText.dispatchEvent(new Event("input", { bubbles: true }));
    pasteStatus.textContent = wasTruncated
      ? "CSV ajustado; o conteúdo foi limitado a 1001 linhas."
      : `CSV ajustado: ${Math.min(records.length, 1000)} registros.`;
  });

  downloadCsvBtn.addEventListener("click", () => {
    const now = new Date();
    const dateParts = [now.getDate(), now.getMonth() + 1, now.getFullYear()]
      .map((part) => String(part).padStart(2, "0"));
    const filename = `${dateParts.join("-")}.csv`;
    const fileUrl = URL.createObjectURL(
      new Blob([csvText.value], { type: "text/csv;charset=utf-8" })
    );
    const downloadLink = document.createElement("a");
    downloadLink.href = fileUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 0);
  });

  let selectedFile = null;
  let config = {
    maxFileSizeMb: 100,
    maxFileSizeBytes: 100 * 1024 * 1024,
    allowedExtensions: [
      "zip",
      "mp4",
      "ogg",
      "aac",
      "mp3",
      "xls",
      "xlsx",
      "doc",
      "docx",
      "pdf",
      "txt",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "csv",
    ],
    retentionDays: 30,
  };

  function preferredTheme() {
    const saved = localStorage.getItem("gowaupload-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gowaupload-theme", theme);
  }

  applyTheme(preferredTheme());

  themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
  });

  function applyConfig(next) {
    config = next;
    const allowed = config.allowedExtensions;
    fileInput.accept = allowed.map((ext) => `.${ext}`).join(",");
    dropzoneMeta.innerHTML = `${allowed.join(" · ")} — máx. ${config.maxFileSizeMb}&nbsp;MB`;
    retentionDaysEl.textContent = `${config.retentionDays} dias`;
    footerRetention.textContent = `Retenção de ${config.retentionDays} dias`;
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Falha ao carregar config");
      applyConfig(await res.json());
    } catch {
      applyConfig(config);
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = type ? `status is-${type}` : "status";
  }

  function extensionOf(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  }

  function resetResult() {
    result.hidden = true;
    fileUrl.value = "";
    openLink.href = "#";
  }

  function clearSelection() {
    selectedFile = null;
    fileInput.value = "";
    fileChip.hidden = true;
    uploadBtn.disabled = true;
    progress.hidden = true;
    progressBar.style.width = "0%";
    progressLabel.textContent = "0%";
    resetResult();
    setStatus("");
  }

  function selectFile(file) {
    if (!file) return;

    const allowed = new Set(config.allowedExtensions);
    const ext = extensionOf(file.name);
    if (!allowed.has(ext)) {
      clearSelection();
      setStatus(
        `Formato não permitido. Use: ${config.allowedExtensions.join(", ")}.`,
        "error"
      );
      return;
    }

    if (file.size > config.maxFileSizeBytes) {
      clearSelection();
      setStatus(
        `Arquivo muito grande. O tamanho máximo é ${config.maxFileSizeMb} MB.`,
        "error"
      );
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileChip.hidden = false;
    uploadBtn.disabled = false;
    progress.hidden = true;
    resetResult();
    setStatus("");
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", () => {
    selectFile(fileInput.files?.[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    selectFile(e.dataTransfer?.files?.[0]);
  });

  clearFile.addEventListener("click", clearSelection);

  uploadBtn.addEventListener("click", () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    uploadBtn.disabled = true;
    progress.hidden = false;
    progressBar.style.width = "0%";
    progressLabel.textContent = "0%";
    resetResult();
    setStatus("Enviando...");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = `${pct}%`;
      progressLabel.textContent = `${pct}%`;
    });

    xhr.addEventListener("load", () => {
      uploadBtn.disabled = false;
      let data = null;
      const rawResponse = xhr.responseText || "";

      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          data = null;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        progressBar.style.width = "100%";
        progressLabel.textContent = "100%";
        fileUrl.value = data.url;
        openLink.href = data.url;
        result.hidden = false;
        const days = data.retentionDays || config.retentionDays;
        setStatus(
          `Upload concluído. O arquivo ficará disponível por ${days} dias.`,
          "ok"
        );
        return;
      }

      if (data?.error) {
        setStatus(data.error, "error");
        return;
      }

      if (xhr.status === 413) {
        setStatus(
          `Arquivo muito grande. O tamanho máximo é ${config.maxFileSizeMb} MB.`,
          "error"
        );
        return;
      }

      if (rawResponse.trim()) {
        setStatus(`Falha no upload: ${rawResponse.trim()}`, "error");
      } else {
        setStatus(`Falha no upload. Código ${xhr.status}.`, "error");
      }
    });

    xhr.addEventListener("error", () => {
      uploadBtn.disabled = false;
      setStatus("Erro de rede ao enviar o arquivo.", "error");
    });

    xhr.send(formData);
  });

  copyBtn.addEventListener("click", async () => {
    if (!fileUrl.value) return;
    try {
      await navigator.clipboard.writeText(fileUrl.value);
      setStatus("Link copiado!", "ok");
    } catch {
      fileUrl.select();
      document.execCommand("copy");
      setStatus("Link copiado!", "ok");
    }
  });

  loadConfig();
})();
