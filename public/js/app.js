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

  let selectedFile = null;
  let config = {
    maxFileSizeMb: 128,
    maxFileSizeBytes: 128 * 1024 * 1024,
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
