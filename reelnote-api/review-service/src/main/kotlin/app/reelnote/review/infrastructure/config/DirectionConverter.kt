package app.reelnote.review.infrastructure.config

import app.reelnote.review.interfaces.dto.Direction
import org.springframework.core.convert.converter.Converter
import org.springframework.stereotype.Component

@Component
class DirectionConverter : Converter<String, Direction> {
	override fun convert(source: String): Direction {
		val s = source.trim()
		return Direction.entries.firstOrNull {
			it.value.equals(s, ignoreCase = true) || it.name.equals(s, ignoreCase = true)
		} ?: Direction.DESC
	}
}


