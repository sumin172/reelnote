package app.reelnote.review.infrastructure.config

import app.reelnote.review.interfaces.dto.SortBy
import org.springframework.core.convert.converter.Converter
import org.springframework.stereotype.Component

@Component
class SortByConverter : Converter<String, SortBy> {
    override fun convert(source: String): SortBy {
        val s = source.trim()
        return SortBy.entries.firstOrNull {
            it.value.equals(s, ignoreCase = true) || it.name.equals(s, ignoreCase = true)
        } ?: SortBy.CREATED_AT
    }
}
