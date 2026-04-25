import Image from "next/image";
import logo from "@/public/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="hidden lg:block bg-gray-200 dark:bg-zinc-950 dark:text-white py-4 mt-auto bottom-0 left-0 right-0"
      data-oid="kl6wtmh"
    >
      <div
        className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4"
        data-oid="l:1-18r"
      >
        <div className="mb-4 md:mb-0" data-oid="k0_1szr">
          <Image
            src={logo}
            alt="Logo"
            className="h-6 w-auto dark:invert"
            data-oid="qiyhk2x"
          />
        </div>
        <div
          className="flex flex-wrap justify-center md:justify-start mb-4 md:mb-0"
          data-oid="fkmqux1"
        >
          <ul className="flex space-x-4" data-oid="daif0cx">
            <li data-oid="u4iem0c">
              <a
                className="hover:text-emerald-500"
                href="/products"
                data-oid="sjuufbo"
              >
                Products
              </a>
            </li>
            <li data-oid="cae68th">
              <a
                className="hover:text-emerald-500"
                href="/stores"
                data-oid="fun.lm1"
              >
                Stores
              </a>
            </li>
            <li data-oid=".zjw8l7">
              <a
                className="hover:text-emerald-500"
                href="/about"
                data-oid="z.j5pig"
              >
                About
              </a>
            </li>
            <li data-oid="5y8i_su">
              <a
                className="hover:text-emerald-500"
                href="/support"
                data-oid="4mjl:6:"
              >
                Support
              </a>
            </li>
            <li data-oid="ccp2.ep">
              <a
                className="hover:text-emerald-500"
                href="/terms"
                data-oid=":_lxlag"
              >
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
        <div data-oid="x-.ynyn">
          <p className="text-sm text-gray-500 mt-2 md:mt-0" data-oid="4v24cva">
            &copy; {currentYear} Ohi! Directory. <br data-oid="i54wrfe" />
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
