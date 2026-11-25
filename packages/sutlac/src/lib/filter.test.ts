import { expect, test } from "bun:test";
import { fold } from "./filter";

test("arama katlaması Türkçe ve İngilizce büyük harfleri aynı yere indirir", () => {
  expect(fold("İstanbul")).toBe("istanbul");
  expect(fold("ISTANBUL")).toBe("istanbul");
  expect(fold("Işık Çağrı ÖĞÜŞ")).toBe("isik cagri ogus");
  expect(fold("TITLE")).toBe("title");
});
