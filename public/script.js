const fileElem = document.getElementById('fileElem');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const deleteBtn = document.getElementById('delete-btn');
const messageBox = document.getElementById('messageBox');
const dropArea = document.getElementById('drop-area');
const spinner = document.getElementById('spinner');

fileElem.addEventListener('change', () => {
  if (fileElem.files.length > 0) {
    const file = fileElem.files[0];
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    clearMessages();
    previewExcel(file);
  }
});

deleteBtn.addEventListener('click', () => {
  fileElem.value = '';
  fileInfo.classList.add('hidden');
  fileName.textContent = '';
  document.getElementById('preview').classList.add('hidden');
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  spinner.classList.remove('hidden');

  if (fileElem.files.length === 0) {
    showMessage('Please choose a file first.', 'error');
    spinner.classList.add('hidden');
    return;
  }

  const formData = new FormData();
  formData.append('excelFile', fileElem.files[0]);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    spinner.classList.add('hidden');

    if (!response.ok) {
      showMessage(result.message || 'Upload failed.', 'error');
      if (Array.isArray(result.errors)) {
        result.errors.forEach(err => showMessage(err, 'error'));
        const csv = generateCSV(result.errors);
        createDownloadLink(csv, 'error_report.csv');
      }
    } else {
      showMessage(result.message, 'success');
      fileElem.value = '';
      fileInfo.classList.add('hidden');
      fileName.textContent = '';
      document.getElementById('preview').classList.add('hidden');
    }
  } catch (err) {
    spinner.classList.add('hidden');
    showMessage('❌ Unexpected error while uploading.', 'error');
  }
});

// Drag & Drop Events
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  });
});

dropArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (
    files.length > 0 &&
    (files[0].name.endsWith('.xlsx') || files[0].name.endsWith('.xls'))
  ) {
    fileElem.files = files;
    fileName.textContent = files[0].name;
    fileInfo.classList.remove('hidden');
    clearMessages();
    previewExcel(files[0]);
  } else {
    showMessage('Only Excel files (.xlsx, .xls) are allowed.', 'error');
  }
});

function previewExcel(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const table = document.getElementById('previewTable');
    table.innerHTML = '';

    json.slice(0, 6).forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    document.getElementById('preview').classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}

function showMessage(msg, type) {
  messageBox.classList.remove('hidden', 'error', 'success');
  messageBox.classList.add(type);
  const p = document.createElement('p');
  p.textContent = msg;
  messageBox.appendChild(p);
}

function clearMessages() {
  messageBox.classList.add('hidden');
  messageBox.classList.remove('error', 'success');
  messageBox.innerHTML = '';
}

function generateCSV(errors) {
  return "Error Message\n" + errors.map(msg => `"${msg}"`).join("\n");
}

function createDownloadLink(csvData, filename) {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.textContent = '📥 Download Error Report';
  link.style.display = 'block';
  link.style.marginTop = '10px';
  messageBox.appendChild(link);
}