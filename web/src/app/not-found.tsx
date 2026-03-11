import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function NotFound() {
  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="card p-8">
          <div className="text-lg font-semibold">Страница не найдена</div>
          <div className="mt-2 text-sm text-zinc-600">Проверьте адрес или вернитесь на главную.</div>
          <div className="mt-6">
            <Link href="/" className="btn btn-primary">
              На главную
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

