// Receipt data contract shared with the native Android plugin (mote-pos-apk).
// The APK's BluetoothPrinter.printReceipt({ receipt }) renders these fields to
// ESC/POS (58mm). Keep this in sync with the bridge contract documented in the
// mote-pos-apk README ("Web integration contract").

export interface ReceiptItem {
  name: string
  qty: number
  unit?: string
  price: number
  subtotal: number
}

export interface ReceiptData {
  storeName: string
  storeAddress?: string
  outletName?: string
  cashierName: string
  transactionNo: string
  datetime: string
  items: ReceiptItem[]
  subtotal: number
  discount?: number
  total: number
  paymentMethod: string
  amountPaid?: number
  change?: number
  customerName?: string
  footer?: string
  qrData?: string
}
