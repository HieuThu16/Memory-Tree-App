# Deploy Bang Vercel CLI

Tai lieu nay ghi lai cach deploy repo nay bang CLI, dung voi cau hinh hien tai.

## Yeu cau

- Da cai Node.js va `npm`
- Da cai Vercel CLI:

```bash
npm install -g vercel
```

- Da dang nhap Vercel:

```bash
vercel login
```

- Dang dung tai thu muc goc cua project:

```bash
cd "D:\Desktop\Memory Tree App"
```

## Build local truoc khi deploy

Nen kiem tra build truoc:

```bash
npm run build
```

## Script nhanh trong package.json

Repo nay da co san script deploy production:

```bash
npm run deploy-prod
```

Script nay da goi san Vercel CLI voi dung public env dang dung cho project.

## Deploy production ngay lap tuc

Lenh da dung thanh cong cho repo nay:

```bash
vercel deploy --prod --yes \
  --build-env NEXT_PUBLIC_SUPABASE_URL=https://xhgpxtuzocqqqgsdfqig.supabase.co \
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY \
  --env NEXT_PUBLIC_SUPABASE_URL=https://xhgpxtuzocqqqgsdfqig.supabase.co \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Neu dang dung PowerShell tren Windows, viet 1 dong se on dinh hon:

```powershell
vercel deploy --prod --yes --build-env NEXT_PUBLIC_SUPABASE_URL=https://xhgpxtuzocqqqgsdfqig.supabase.co --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY --env NEXT_PUBLIC_SUPABASE_URL=https://xhgpxtuzocqqqgsdfqig.supabase.co --env NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## URL sau khi deploy

- Production alias: `https://memory-tree-app.vercel.app`
- Moi lan deploy, Vercel se tra ve 1 inspect URL va 1 production URL moi truoc khi alias vao domain chinh.

## Cach deploy tot hon cho nhung lan sau

Khong nen truyen env bang tay moi lan neu deploy thuong xuyen. Hay luu env vao project Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

Sau khi da luu env, chi can:

```bash
vercel deploy --prod --yes
```

## Neu chua link project

Neu may moi chua duoc link voi Vercel project, chay:

```bash
vercel link
```

Sau do deploy lai.

## Mot quy trinh de xai hang ngay

```bash
npm run build
npm run deploy-prod
```

Neu production can public env ngay trong lan deploy dau tien, dung lenh day du o phan tren.

## Luu y

- `NEXT_PUBLIC_*` la bien public, duoc dua vao client bundle.
- Khong dat service role key vao `NEXT_PUBLIC_*`.
- Repo nay dang deploy tot tren Vercel voi Next.js App Router.
