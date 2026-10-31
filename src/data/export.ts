import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { State } from '../domain/finance';
import { createWorkbook } from '../domain/workbook';
export async function exportExcel(s: State, from: string, to: string) {
  const workbook = createWorkbook(s,from,to);
  const filename = `Qgasto_${from}_${to}.xlsx`;
  if (Platform.OS === 'web') { XLSX.writeFile(workbook,filename); return; }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos');
  const bytes = XLSX.write(workbook,{type:'array',bookType:'xlsx'});
  const file = new File(Paths.cache,filename);
  file.write(new Uint8Array(bytes));
  await Sharing.shareAsync(file.uri,{mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',UTI:'org.openxmlformats.spreadsheetml.sheet'});
}
