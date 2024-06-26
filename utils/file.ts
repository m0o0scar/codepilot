export const downloadUrl = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  URL.revokeObjectURL(url);
};

export const downloadTextFile = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  downloadBlob(blob, filename);
};

export const languageToFileExt = (language: string) => {
  switch (language) {
    case 'python':
      return 'py';

    case 'javascript':
      return 'js';

    case 'typescript':
      return 'ts';

    case 'rust':
      return 'rs';

    case 'py':
    case 'js':
    case 'css':
    case 'html':
    case 'dart':
    case 'diff':
      return language;

    default:
      return 'txt';
  }
};
